from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models import (
    Event,
    User,
    EventVendorAgreement,
    Payment,
    EventApplication,
    BudgetPlanItem,
    Review,
    vendor_events,
    get_reserving_vendor_id_for_event,
)
import os
import uuid
from collections import defaultdict
from datetime import datetime
import requests
from openai import OpenAI

events_bp = Blueprint("events", __name__, url_prefix="/api/events")


def _event_recency_sort_key(event):
    """Newest activity first: updated_at, else created_at, else id (for legacy rows)."""
    t = event.updated_at or event.created_at
    if t is not None:
        return (t.timestamp() if hasattr(t, "timestamp") else 0, event.id)
    return (0.0, event.id)


def _sort_events_by_recency_desc(events):
    return sorted(events, key=_event_recency_sort_key, reverse=True)


# ✅ Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None


def generate_ai_suggestions(category: str, budget: float) -> list:
    """Generate AI suggestions for vendors/checklist based on category and budget."""
    if not client:
        return [
            f"Recommended vendor for {category}: Local Caterers (~${budget * 0.3}).",
            f"Checklist item: Book venue early to stay under ${budget}.",
            f"Tip: Allocate 20% of ${budget} for decorations in {category} events."
        ]

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an event planning assistant. Provide 3 concise suggestions for vendors or tips based on the event category and budget."},
                {"role": "user", "content": f"Suggest 3 vendors or planning tips for a {category} event with budget ${budget}."}
            ],
            max_tokens=150
        )

        suggestions = response.choices[0].message.content.strip().split("\n")
        return [s.strip("-• ").strip() for s in suggestions if s.strip()]

    except Exception as e:
        print(f"⚠️ OpenAI error: {e}")
        return ["AI suggestions unavailable — check your API key."]


# ✅ Debug route for token testing
@events_bp.route("/debug-token", methods=["GET", "POST"])
@jwt_required()
def debug_token():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    return jsonify({
        "user_id": current_user_id,
        "user_exists": bool(user),
        "user_role": user.role if user else None,
        "token_valid": True,
        "message": "Token is valid"
    }), 200


# ✅ Get all events (per user)
@events_bp.route("", methods=["GET"])
@jwt_required()
def list_events():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Personal + assigned lists: order by last update (or creation), most recent first
    created_events = _sort_events_by_recency_desc(
        Event.query.filter_by(user_id=user_id).all()
    )

    assigned_events = []
    if user.role == "organizer":
        assigned_events = _sort_events_by_recency_desc(
            Event.query.filter_by(organizer_id=user_id).all()
        )

    # Compute total_spent from Payment table (same rules as get_budget_summary)
    event_ids = list({e.id for e in created_events} | {e.id for e in assigned_events})
    totals = defaultdict(float)
    if event_ids:
        payments = (
            Payment.query.filter(
                Payment.event_id.in_(event_ids),
                Payment.status == "completed",
            )
            .filter(
                Payment.payment_type.in_(
                    ["advance", "final", "organizer_advance", "organizer_final"]
                )
            )
            .all()
        )
        for p in payments:
            totals[p.event_id] += float(p.amount or 0)

    open_event_ids = [e.id for e in created_events if e.organizer_id is None and e.status == "created"]
    app_counts = defaultdict(int)
    if open_event_ids:
        counts = db.session.query(EventApplication.event_id, func.count(EventApplication.id)).filter(
            EventApplication.event_id.in_(open_event_ids)
        ).group_by(EventApplication.event_id).all()
        for eid, c in counts:
            app_counts[eid] = c

    def event_to_dict_with_spent(e):
        d = e.to_dict()
        spent = totals.get(e.id, 0.0)
        d["total_spent"] = spent
        d["remaining_budget"] = float(e.budget or 0) - spent
        if e.organizer_id is None and e.status == "created":
            d["application_count"] = app_counts.get(e.id, 0)
        d["reserving_vendor_id"] = get_reserving_vendor_id_for_event(e.id)
        return d

    return jsonify({
        "created": [event_to_dict_with_spent(e) for e in created_events],
        "assigned": [event_to_dict_with_spent(e) for e in assigned_events],
    }), 200


# ✅ Create a new event
@events_bp.route("", methods=["POST"])
@jwt_required()
def create_event():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if request is multipart (for file upload)
        if request.content_type.startswith('multipart/form-data'):
            data = request.form
            image_file = request.files.get('image')
        else:
            data = request.get_json()
            image_file = None

        if not data:
            return jsonify({"error": "No data provided"}), 400

        if user.role == "organizer":
            return (
                jsonify(
                    {
                        "error": "Organizers cannot create events. New events are created by event hosts; apply from Open Events when a host posts a project."
                    }
                ),
                403,
            )

        required_fields = ["name", "date", "venue", "vendor_category", "budget"]
        missing = [f for f in required_fields if f not in data or not str(data[f]).strip()]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        budget = float(data["budget"])
        if budget <= 0:
            return jsonify({"error": "Budget must be greater than 0"}), 400

        image_url = data.get("image_url", "")
        
        # Handle file upload if present
        if image_file:
            from werkzeug.utils import secure_filename
            import uuid
            from flask import current_app
            
            filename = secure_filename(image_file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            image_file.save(filepath)
            image_url = f"http://localhost:5000/uploads/{unique_filename}"

        organizer_id = data.get("organizer_id")
        if organizer_id:
            try:
                organizer_id = int(organizer_id)
                # Optional: Validate that the user is actually an organizer
                selected_org = User.query.get(organizer_id)
                if not selected_org or selected_org.role != "organizer":
                    return jsonify({"error": "Invalid organizer selected"}), 400
            except (ValueError, TypeError):
                organizer_id = None

        # Default: if the creator is an organizer and no explicit organizer_id
        # was provided (or it failed validation), assign the event to them.
        if not organizer_id and user.role == "organizer":
            organizer_id = user_id

        # Determine initial lifecycle status
        if organizer_id:
            status = "awaiting_organizer_confirmation"
        else:
            status = "created"

        now = datetime.utcnow()
        event = Event(
            name=data["name"].strip(),
            date=data["date"],
            venue=data["venue"].strip(),
            vendor_category=data["vendor_category"],
            budget=budget,
            image_url=image_url,
            user_id=user_id,
            organizer_id=organizer_id,
            progress=0,
            status=status,
            created_at=now,
            updated_at=now,
        )

        db.session.add(event)
        db.session.commit()

        # Notify Organizer (if one was selected)
        if organizer_id:
            try:
                from app.api.payments import create_notification
                create_notification(
                    int(organizer_id),
                    "📅 New Event Assignment",
                    f"A new event '{event.name}' has been assigned to you. Review the details and respond.",
                    "priority",
                    {"event_id": event.id, "action": "assignment_review"}
                )
            except Exception as e:
                print(f"Organizer notification failed: {e}")
        else:
            # Event posted for applications: notify all active organizers
            try:
                from app.api.payments import create_notification
                organizers = User.query.filter_by(role="organizer", is_active=True).all()
                for org in organizers:
                    create_notification(
                        org.id,
                        "📋 New Open Event",
                        f"A new event '{event.name}' has been posted. View Open Events to apply.",
                        "info",
                        {"event_id": event.id, "action": "open_events"}
                    )
            except Exception as e:
                print(f"Notify organizers of new open event failed: {e}")

        suggestions = generate_ai_suggestions(event.vendor_category, event.budget)

        return jsonify({
            "message": "Event created successfully",
            "event": event.to_dict(),
            "suggestions": suggestions
        }), 201

    except Exception as e:
        print(f"❌ Error in create_event: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


# --- OPEN EVENTS & ORGANIZER APPLICATIONS (freelance-style) ---

@events_bp.route("/open/count", methods=["GET"])
@jwt_required()
def open_events_count():
    """Return count of open events for organizers (for sidebar badge)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != "organizer":
        return jsonify({"count": 0}), 200
    applied_event_ids = [
        a.event_id for a in EventApplication.query.filter_by(organizer_id=user_id).all()
    ]
    query = Event.query.filter(
        Event.organizer_id.is_(None),
        Event.status == "created"
    )
    if applied_event_ids:
        query = query.filter(~Event.id.in_(applied_event_ids))
    count = query.count()
    return jsonify({"count": count}), 200


@events_bp.route("/open", methods=["GET"])
@jwt_required()
def list_open_events():
    """List events with no organizer (status=created). Organizers only. Exclude events current user already applied to."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role != "organizer":
        return jsonify({"error": "Only organizers can view open events"}), 403

    applied_event_ids = [
        a.event_id for a in EventApplication.query.filter_by(organizer_id=user_id).all()
    ]
    query = Event.query.filter(
        Event.organizer_id.is_(None),
        Event.status == "created"
    )
    if applied_event_ids:
        query = query.filter(~Event.id.in_(applied_event_ids))
    open_events = query.all()

    return jsonify([e.to_dict() for e in open_events]), 200


@events_bp.route("/<int:event_id>/apply", methods=["POST"])
@jwt_required()
def apply_to_event(event_id):
    """Organizer applies to an open event. Optional body: { \"message\": \"...\" }."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role != "organizer":
        return jsonify({"error": "Only organizers can apply to events"}), 403

    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    if event.organizer_id is not None:
        return jsonify({"error": "Event already has an organizer"}), 400
    if event.status != "created":
        return jsonify({"error": "Event is not open for applications"}), 400

    existing = EventApplication.query.filter_by(event_id=event_id, organizer_id=user_id).first()
    if existing:
        return jsonify({"error": "You have already applied to this event"}), 409

    data = request.get_json() or {}
    message = (data.get("message") or "").strip() or None

    app = EventApplication(event_id=event_id, organizer_id=user_id, message=message, status="pending")
    db.session.add(app)
    db.session.commit()

    try:
        from app.api.payments import create_notification
        create_notification(
            event.user_id,
            "New application",
            f"An organizer has applied to your event '{event.name}'.",
            "info",
            {"event_id": event.id, "action": "view_applications"}
        )
    except Exception as e:
        print(f"Application notification failed: {e}")

    return jsonify({"message": "Application submitted", "application": app.to_dict()}), 201


@events_bp.route("/<int:event_id>/applications", methods=["GET"])
@jwt_required()
def list_event_applications(event_id):
    """List applications for an event. Event owner only."""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid user"}), 401
    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    if event.user_id != user_id:
        return jsonify({"error": "Only the event owner can view applications"}), 403

    applications = (
        EventApplication.query.options(joinedload(EventApplication.organizer))
        .filter_by(event_id=event_id)
        .order_by(EventApplication.created_at.desc())
        .all()
    )

    org_ids = list({a.organizer_id for a in applications if a.organizer_id})
    ratings_by_subject = {}
    if org_ids:
        rows = (
            db.session.query(
                Review.subject_id,
                func.avg(Review.rating),
                func.count(Review.id),
            )
            .filter(
                Review.subject_id.in_(org_ids),
                Review.review_type == "user_to_organizer",
                Review.status == "published",
            )
            .group_by(Review.subject_id)
            .all()
        )
        for subject_id, avg, cnt in rows:
            ratings_by_subject[int(subject_id)] = (
                round(float(avg), 2) if avg is not None else None,
                int(cnt or 0),
            )

    def serialize_application(a):
        d = a.to_dict()
        org = a.organizer
        if org:
            host_avg, host_cnt = ratings_by_subject.get(org.id, (None, 0))
            d["organizer_profile"] = {
                "id": org.id,
                "name": org.name,
                "city": org.city,
                "category": org.category,
                "profile_image": org.profile_image,
                "organizer_availability": (getattr(org, "organizer_availability", None) or "available"),
                "organizer_package_summary": getattr(org, "organizer_package_summary", None),
                "host_rating_avg": host_avg,
                "host_rating_count": host_cnt,
            }
        else:
            d["organizer_profile"] = None
        return d

    return jsonify([serialize_application(a) for a in applications]), 200


@events_bp.route("/<int:event_id>/assign-organizer", methods=["POST"])
@jwt_required()
def assign_organizer_to_event(event_id):
    """Event owner assigns an organizer from applicants. Body: { \"organizer_id\": <id> }."""
    user_id = get_jwt_identity()
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid user"}), 401
    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    if event.user_id != user_id:
        return jsonify({"error": "Only the event owner can assign an organizer"}), 403
    if event.organizer_id is not None:
        return jsonify({"error": "Event already has an organizer"}), 400
    if event.status != "created":
        return jsonify({"error": "Event is not open for assignment"}), 400

    data = request.get_json() or {}
    organizer_id = data.get("organizer_id")
    if organizer_id is None:
        return jsonify({"error": "organizer_id required"}), 400
    try:
        organizer_id = int(organizer_id)
    except (TypeError, ValueError):
        return jsonify({"error": "organizer_id must be an integer"}), 400

    application = EventApplication.query.filter_by(
        event_id=event_id, organizer_id=organizer_id, status="pending"
    ).first()
    if not application:
        return jsonify({"error": "Organizer has not applied or application is not pending"}), 400

    organizer = User.query.get(organizer_id)
    if not organizer or organizer.role != "organizer":
        return jsonify({"error": "Invalid organizer"}), 400

    event.organizer_id = organizer_id
    event.status = "awaiting_organizer_confirmation"
    event.organizer_status = "pending"
    application.status = "accepted"
    for other in EventApplication.query.filter_by(event_id=event_id).filter(EventApplication.id != application.id).all():
        other.status = "rejected"
    event.updated_at = datetime.utcnow()
    db.session.commit()

    try:
        from app.api.payments import create_notification
        create_notification(
            int(organizer_id),
            "New Event Assignment",
            f"A new event '{event.name}' has been assigned to you. Review the details and respond.",
            "priority",
            {"event_id": event.id, "action": "assignment_review"}
        )
    except Exception as e:
        print(f"Assign organizer notification failed: {e}")

    return jsonify({"message": "Organizer assigned successfully", "event": event.to_dict()}), 200


# ✅ Update existing event
@events_bp.route("/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id):
    try:
        user_id = get_jwt_identity()
        # Allow either the creator OR the assigned organizer to update
        event = Event.query.filter(
            Event.id == event_id,
            db.or_(Event.user_id == user_id, Event.organizer_id == user_id)
        ).first()

        if not event:
            return jsonify({"error": "Event not found or unauthorized"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        # Protected fields (only owner/admin maybe, but for now let's allow organizer too)
        for field in ["name", "date", "venue", "vendor_category", "budget", "progress"]:
            if field in data and str(data[field]).strip():
                if field == "budget" or field == "progress":
                    setattr(event, field, float(data[field]))
                else:
                    setattr(event, field, data[field])
        if "budget" in data:
            total_spent = float(event.total_spent or 0)
            event.remaining_budget = float(data["budget"]) - total_spent

        event.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Notify vendors with a pending or accepted partnership on this event
        try:
            from app.api.payments import create_notification
            convo_vendors = (
                User.query.join(vendor_events, User.id == vendor_events.c.vendor_id)
                .filter(
                    vendor_events.c.event_id == event.id,
                    vendor_events.c.partnership_status.in_(["pending", "accepted"]),
                )
                .all()
            )
            for vendor in convo_vendors:
                create_notification(
                    vendor.id,
                    "📝 Event Updated",
                    f"The event details for '{event.name}' have been updated.",
                    "info",
                    {"event_id": event.id}
                )
        except Exception as e:
            print(f"Update event notification failed: {e}")
            
        return jsonify({"message": "Event updated successfully", "event": event.to_dict()}), 200

    except Exception as e:
        print(f"❌ Error in update_event: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    
# ✅ Assign vendor to an event
@events_bp.route("/<int:event_id>/assign_vendor", methods=["POST"])
@jwt_required()
def assign_vendor(event_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        vendor_id = data.get("vendor_id")
        if not vendor_id:
            return jsonify({"error": "Vendor ID required"}), 400

        vendor = User.query.get(vendor_id)
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Vendor not found"}), 404

        # Allow either creator OR assigned organizer
        event = Event.query.filter(
            Event.id == event_id,
            db.or_(Event.user_id == user_id, Event.organizer_id == user_id)
        ).first()
        
        if not event:
            return jsonify({"error": "Event not found or unauthorized"}), 404

        vendor_id_int = int(vendor_id)
        reserver = get_reserving_vendor_id_for_event(int(event_id))
        if reserver is not None and reserver != vendor_id_int:
            return jsonify({
                "error": (
                    "This event is already reserved for another vendor "
                    "(pending or confirmed). You cannot assign a different vendor."
                )
            }), 400

        vendor.assigned_event = event_id
        db.session.commit()

        return jsonify({"message": f"Vendor '{vendor.name}' assigned to '{event.name}' successfully!"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error assigning vendor: {e}")
        return jsonify({"error": "Internal server error"}), 500

@events_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    try:
        user_id = get_jwt_identity()
        event = Event.query.filter_by(id=event_id, user_id=user_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404

        assigned_vendors_ids = [v.id for v in event.assigned_vendors.all()]
        event_name = event.name

        for vendor in event.assigned_vendors.all():
            event.assigned_vendors.remove(vendor)

        # Canceled (already soft-canceled): permanent removal.
        if event.status == "canceled":
            db.session.delete(event)
            message = "Event removed permanently"
        elif event.status == "completed":
            db.session.delete(event)
            message = "Event removed successfully"
        else:
            # In-progress / draft: soft-cancel so it appears under Canceled on the client dashboard.
            event.status = "canceled"
            event.organizer_id = None
            event.organizer_status = "pending"
            message = "Event canceled successfully"

        db.session.commit()

        try:
            from app.api.payments import create_notification
            for vid in assigned_vendors_ids:
                create_notification(
                    vid,
                    "🚫 Event Cancelled",
                    f"The event '{event_name}' has been deleted/cancelled by the organizer.",
                    "warning"
                )
        except Exception as e:
            print(f"Delete event notification failed: {e}")

        return jsonify({"message": message}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error deleting event: {e}")
        return jsonify({"error": "Internal server error"}), 500

def _nominatim_venue_search(query: str, limit: int = 10) -> list:
    """OpenStreetMap Nominatim forward search (addresses, venues, cities worldwide)."""
    try:
        ua = current_app.config.get(
            "NOMINATIM_USER_AGENT",
            "Eventify/1.0 (venue search)",
        )
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": query,
                "format": "json",
                "limit": limit,
                "addressdetails": 0,
            },
            headers={
                "User-Agent": ua,
                "Accept-Language": "en",
            },
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
        rows = data if isinstance(data, list) else []
        out = []
        for item in rows:
            name = item.get("display_name")
            if name and name not in out:
                out.append(name)
        return out
    except Exception as e:
        print(f"Nominatim venue search: {e}")
        return []


# ✅ Venue suggestions: your past venues + OSM autocomplete + curated regional list
@events_bp.route("/venue-suggestions", methods=["GET"])
@jwt_required()
def get_venue_suggestions():
    try:
        q = request.args.get("q", "").strip()
        q_lower = q.lower()

        if len(q) < 2:
            return jsonify({"suggestions": []})

        seen = set()
        suggestions = []

        def add_label(label: str) -> None:
            label = (label or "").strip()
            if not label:
                return
            key = label.lower()
            if key in seen:
                return
            seen.add(key)
            suggestions.append(label)

        # 1) Venues already used in this database (user's org / app history)
        try:
            rows = (
                db.session.query(Event.venue)
                .filter(func.lower(Event.venue).contains(q_lower))
                .distinct()
                .limit(8)
                .all()
            )
            for (venue,) in rows:
                add_label(venue)
        except Exception as e:
            print(f"venue DB suggestions: {e}")

        # 2) Live place & address autocomplete (OpenStreetMap)
        for label in _nominatim_venue_search(q, limit=10):
            add_label(label)
            if len(suggestions) >= 15:
                return jsonify({"suggestions": suggestions[:15]})

        # 3) Curated regional venues when useful (offline-friendly extras)
        pakistani_venues = [
            "Expo Center Lahore",
            "Pearl Continental Hotel Karachi",
            "Serena Hotel Islamabad",
            "Lahore Expo Centre",
            "Karachi Expo Center",
            "Punjab Stadium Lahore",
            "National Stadium Karachi",
            "Jinnah Convention Center Islamabad",
            "Alhamra Arts Council Lahore",
            "Frere Hall Karachi",
            "PC Hotel Lahore",
            "Marriott Hotel Islamabad",
            "Avari Hotel Lahore",
            "Mövenpick Hotel Karachi",
            "Royal Palm Golf Club Lahore",
            "Beach Luxury Hotel Karachi",
            "Islamabad Club",
            "Lahore Gymkhana",
            "Karachi Golf Club",
            "PAF Museum Karachi",
            "Lahore Museum",
            "Pakistan National Council of Arts Islamabad",
            "Convention Center Peshawar",
            "Bacha Khan Center Peshawar",
        ]
        for venue in pakistani_venues:
            if q_lower in venue.lower():
                add_label(venue)
            if len(suggestions) >= 15:
                break

        return jsonify({"suggestions": suggestions[:15]})

    except Exception as e:
        print(f"Error in venue suggestions: {e}")
        return jsonify({"suggestions": []})

# ✅ Respond to an organizer assignment (Accept/Reject)
@events_bp.route("/<int:event_id>/respond-assignment", methods=["POST"])
@jwt_required()
def respond_assignment(event_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        status = data.get("status") # 'accepted' or 'rejected'

        if status not in ["accepted", "rejected"]:
            return jsonify({"error": "Invalid status. Must be 'accepted' or 'rejected'."}), 400

        # Verify that this user IS the assigned organizer
        event = Event.query.filter_by(id=event_id, organizer_id=user_id).first()
        if not event:
            return jsonify({"error": "Assignment not found or unauthorized"}), 404

        event.organizer_status = status
        # Update high-level lifecycle status
        if status == "accepted":
            event.status = "pending_advance_payment"
        elif status == "rejected":
            # Return event to a generic created state for the owner
            event.status = "created"

        event.updated_at = datetime.utcnow()
        db.session.commit()

        # Notify the Event Creator
        try:
            from app.api.payments import create_notification
            icon = "✅" if status == "accepted" else "❌"
            msg = f"Your event expert '{event.organizer.name}' has {status} the assignment for '{event.name}'."
            create_notification(
                event.user_id,
                f"{icon} Assignment {status.capitalize()}",
                msg,
                "success" if status == "accepted" else "warning",
                {"event_id": event.id}
            )
        except Exception as e:
            print(f"Creator notification failed: {e}")

        return jsonify({
            "message": f"Assignment {status} successfully",
            "status": status
        }), 200

    except Exception as e:
        print(f"❌ Error in respond_assignment: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@events_bp.route("/<int:event_id>/create-advance-request", methods=["POST"])
@jwt_required()
def create_advance_request(event_id):
    """
    Create a 25% advance payment request from the organizer to the event owner.

    Only the assigned organizer can create this, and only when the event is in
    'pending_advance_payment' status. If a paid request already exists for this
    event and organizer, no new request is allowed.
    """
    try:
        from app.models import OrganizerPaymentRequest  # local import to avoid cycles
        from app.api.payments import create_notification

        user_id = get_jwt_identity()
        organizer = User.query.get(user_id)
        if not organizer or organizer.role != "organizer":
            return jsonify({"error": "Only organizers can create advance requests"}), 403

        event = Event.query.filter_by(id=event_id, organizer_id=user_id).first()
        if not event:
            return jsonify({"error": "Event not found or unauthorized"}), 404

        if event.status != "pending_advance_payment":
            return jsonify({"error": "Advance request can only be created when the event is pending advance payment"}), 400

        if not event.budget or event.budget <= 0:
            return jsonify({"error": "Event budget must be set before creating an advance request"}), 400

        # Ensure we don't create multiple paid requests for the same event/organizer
        existing_paid = OrganizerPaymentRequest.query.filter_by(
            event_id=event.id,
            organizer_id=user_id,
            status="paid",
        ).first()
        if existing_paid:
            return jsonify({"error": "An advance payment for this event has already been paid"}), 400

        # If a pending request already exists, just return it instead of duplicating
        existing_pending = OrganizerPaymentRequest.query.filter_by(
            event_id=event.id,
            organizer_id=user_id,
            status="pending",
        ).first()
        if existing_pending:
            return jsonify(
                {
                    "message": "An advance request is already pending for this event",
                    "organizer_request": existing_pending.to_dict(),
                }
            ), 200

        amount = float(event.budget) * 0.25
        opr = OrganizerPaymentRequest(
            event_id=event.id,
            organizer_id=user_id,
            amount=amount,
            description="25% advance payment for event organizer services",
            status="pending",
        )
        db.session.add(opr)
        db.session.commit()

        # Notify the event owner (client)
        try:
            create_notification(
                event.user_id,
                "Advance payment requested",
                f"Your organizer has requested a 25% advance payment for '{event.name}'.",
                "payment",
                {"organizer_request_id": opr.id, "event_id": event.id},
            )
        except Exception as e:
            print(f"Advance request notification failed: {e}")

        return jsonify(
            {
                "message": "25% advance request created",
                "organizer_request": opr.to_dict(),
            }
        ), 201

    except Exception as e:
        print(f"❌ Error in create_advance_request: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@events_bp.route("/<int:event_id>/create-final-request", methods=["POST"])
@jwt_required()
def create_final_request(event_id):
    """
    Create a 75% final payment request from the organizer to the event owner.

    Only the assigned organizer can create this, and only after the 25% advance
    has been paid and the event is marked as completed. If a pending final
    request already exists, or a final payment has already been paid, no new
    request is allowed.
    """
    try:
        from app.models import OrganizerPaymentRequest  # local import to avoid cycles
        from app.api.payments import create_notification

        user_id = get_jwt_identity()
        organizer = User.query.get(user_id)
        if not organizer or organizer.role != "organizer":
            return jsonify({"error": "Only organizers can create final payment requests"}), 403

        event = Event.query.filter_by(id=event_id, organizer_id=user_id).first()
        if not event:
            return jsonify({"error": "Event not found or unauthorized"}), 404

        # Require 25% advance to be paid first
        if not getattr(event, "organizer_advance_paid", False):
            return jsonify({"error": "Advance (25%) payment must be paid before requesting final payment"}), 400

        # Require the event to be completed before requesting the remaining 75%
        if event.status != "completed":
            return jsonify({"error": "Event must be marked as completed before requesting the final 75% payment"}), 400

        if not event.budget or event.budget <= 0:
            return jsonify({"error": "Event budget must be set before creating a final payment request"}), 400

        final_amount = round(float(event.budget) * 0.75, 2)

        # Block duplicate paid final requests
        existing_final_paid = (
            OrganizerPaymentRequest.query.filter_by(
                event_id=event.id,
                organizer_id=user_id,
                status="paid",
            )
            .filter(OrganizerPaymentRequest.amount == final_amount)
            .first()
        )
        if existing_final_paid:
            return jsonify({"error": "Final payment for this event has already been paid"}), 400

        # If a pending final request already exists, just return it instead of duplicating
        existing_final_pending = (
            OrganizerPaymentRequest.query.filter_by(
                event_id=event.id,
                organizer_id=user_id,
                status="pending",
            )
            .filter(OrganizerPaymentRequest.amount == final_amount)
            .first()
        )
        if existing_final_pending:
            return jsonify(
                {
                    "message": "A final payment request is already pending for this event",
                    "organizer_request": existing_final_pending.to_dict(),
                }
            ), 200

        opr = OrganizerPaymentRequest(
            event_id=event.id,
            organizer_id=user_id,
            amount=final_amount,
            description="75% final payment for event organizer services",
            status="pending",
        )
        db.session.add(opr)

        # Mark that the final payment has been requested
        event.organizer_final_requested = True

        db.session.commit()

        # Notify the event owner (client)
        try:
            create_notification(
                event.user_id,
                "Final payment requested",
                f"Your organizer has requested the remaining 75% payment for '{event.name}'.",
                "payment",
                {"organizer_request_id": opr.id, "event_id": event.id},
            )
        except Exception as e:
            print(f"Final payment request notification failed: {e}")

        return jsonify(
            {
                "message": "75% final payment request created",
                "organizer_request": opr.to_dict(),
            }
        ), 201

    except Exception as e:
        print(f"❌ Error in create_final_request: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@events_bp.route("/<int:event_id>/complete", methods=["POST"])
@jwt_required()
def complete_event(event_id):
    """
    Mark an event as completed.

    Allowed for the event owner or the assigned organizer.
    """
    try:
        user_id = get_jwt_identity()
        event = Event.query.filter(
            Event.id == event_id,
            db.or_(Event.user_id == user_id, Event.organizer_id == user_id),
        ).first()

        if not event:
            return jsonify({"error": "Event not found or unauthorized"}), 404

        event.status = "completed"
        # Optionally ensure progress reflects completion
        if event.progress is None or event.progress < 100:
            event.progress = 100

        event.updated_at = datetime.utcnow()
        db.session.commit()

        # If organizer completed work after 25% payment, prompt next 75% request step via notification
        try:
            if event.organizer_id and int(user_id) == int(event.organizer_id) and getattr(event, "organizer_advance_paid", False) and not getattr(event, "organizer_final_paid", False):
                from app.api.payments import create_notification
                create_notification(
                    int(event.organizer_id),
                    "Action required: request remaining 75%",
                    f"'{event.name}' is completed. Open Payments > Organizer Fees to request the remaining 75% from the client.",
                    "payment",
                    {
                        "event_id": event.id,
                        "action": "organizer_payment_followup",
                        "category": "organizer_fee",
                    },
                )
        except Exception as notify_err:
            print(f"Complete event follow-up notification failed: {notify_err}")

        return jsonify({"message": "Event marked as completed", "event": event.to_dict()}), 200

    except Exception as e:
        print(f"❌ Error in complete_event: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


# --- BUDGET PLANNER (FR-04) ---

def _get_event_for_budget(event_id, user_id):
    """Get event if user is owner or organizer."""
    return Event.query.filter(
        Event.id == event_id,
        db.or_(Event.user_id == user_id, Event.organizer_id == user_id)
    ).first()


def _budget_plan_payload(event_id: int, total_budget: float) -> dict:
    rows = (
        BudgetPlanItem.query.filter_by(event_id=event_id)
        .order_by(BudgetPlanItem.sort_order, BudgetPlanItem.id)
        .all()
    )
    plan_total = float(sum((p.allocated_amount or 0) for p in rows))
    return {
        "items": [p.to_dict() for p in rows],
        "total_allocated": round(plan_total, 2),
        "unallocated": round(float(total_budget or 0) - plan_total, 2),
    }


@events_bp.route("/<int:event_id>/budget-summary", methods=["GET"])
@jwt_required()
def get_budget_summary(event_id):
    """Budget overview: total_budget, total_spent, remaining, vendor agreements with advance/final status."""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    total_budget = float(event.budget or 0)

    # Recompute total_spent and remaining_budget from completed payments
    completed_payments = (
        Payment.query.filter_by(
            event_id=event_id,
            status="completed",
        )
        .filter(
            Payment.payment_type.in_(
                ["advance", "final", "organizer_advance", "organizer_final"]
            )
        )
        .all()
    )

    total_spent = float(sum(p.amount or 0 for p in completed_payments))
    remaining_budget = total_budget - total_spent

    agreements = EventVendorAgreement.query.filter_by(event_id=event_id).all()
    vendor_agreements = []
    for a in agreements:
        advance_amt = round(a.agreed_price * 0.25, 2)
        final_amt = round(a.agreed_price * 0.75, 2)
        advance_paid = Payment.query.filter_by(
            event_id=event_id, vendor_id=a.vendor_id, payment_type="advance", status="completed"
        ).first()
        final_paid = Payment.query.filter_by(
            event_id=event_id, vendor_id=a.vendor_id, payment_type="final", status="completed"
        ).first()
        vendor_agreements.append({
            "id": a.id,
            "vendor_id": a.vendor_id,
            "vendor_name": a.vendor.name if a.vendor else "Unknown",
            "service_type": a.service_type or "General",
            "agreed_price": a.agreed_price,
            "advance_amount": advance_amt,
            "final_amount": final_amt,
            "advance_status": "paid" if advance_paid else "pending",
            "final_status": "paid" if final_paid else "pending",
            "payment_status": a.payment_status,
        })

    agreement_vendor_ids = {a.vendor_id for a in agreements}
    accepted_vendors = (
        User.query.join(vendor_events, User.id == vendor_events.c.vendor_id)
        .filter(
            vendor_events.c.event_id == event_id,
            vendor_events.c.partnership_status == "accepted",
        )
        .all()
    )
    assigned_without_agreement = [
        {"id": v.id, "name": v.name, "category": v.category or "Vendor"}
        for v in accepted_vendors
        if v.id not in agreement_vendor_ids
    ]

    return jsonify({
        "event_id": event_id,
        "event_name": event.name,
        "event_owner_id": event.user_id,
        "organizer_id": event.organizer_id,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "remaining_budget": remaining_budget,
        "vendor_agreements": vendor_agreements,
        "assigned_vendors_without_agreement": assigned_without_agreement,
        "budget_plan": _budget_plan_payload(event_id, total_budget),
    }), 200


@events_bp.route("/<int:event_id>/budget-plan", methods=["PUT"])
@jwt_required()
def put_budget_plan(event_id):
    """Replace budget plan line items (category + planned amount). Body: { items: [{ label, allocated_amount, notes? }] }"""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    data = request.get_json() or {}
    items = data.get("items")
    if not isinstance(items, list):
        return jsonify({"error": "items must be an array"}), 400

    try:
        BudgetPlanItem.query.filter_by(event_id=event_id).delete()
        for idx, row in enumerate(items):
            if not isinstance(row, dict):
                continue
            label = (row.get("label") or "").strip()
            if not label:
                continue
            try:
                amt = float(row.get("allocated_amount", 0))
            except (TypeError, ValueError):
                return jsonify({"error": f"Invalid amount for row {idx + 1}"}), 400
            if amt < 0:
                return jsonify({"error": "allocated_amount must be non-negative"}), 400
            notes = row.get("notes")
            if notes is not None:
                notes = str(notes).strip()[:2000] or None
            db.session.add(
                BudgetPlanItem(
                    event_id=event_id,
                    label=label[:120],
                    allocated_amount=amt,
                    notes=notes,
                    sort_order=idx,
                )
            )
        event.updated_at = datetime.utcnow()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"put_budget_plan: {e}")
        return jsonify({"error": "Could not save budget plan"}), 500

    total_budget = float(event.budget or 0)
    return jsonify({"message": "Budget plan saved", "budget_plan": _budget_plan_payload(event_id, total_budget)}), 200


@events_bp.route("/<int:event_id>/budget", methods=["PATCH"])
@jwt_required()
def update_event_budget(event_id):
    """Set/update event total budget; recalc remaining_budget."""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    data = request.get_json() or {}
    budget_val = data.get("budget")
    if budget_val is None:
        return jsonify({"error": "budget required"}), 400
    try:
        budget_val = float(budget_val)
    except (TypeError, ValueError):
        return jsonify({"error": "budget must be a number"}), 400
    if budget_val < 0:
        return jsonify({"error": "budget must be non-negative"}), 400

    event.budget = budget_val
    total_spent = float(event.total_spent or 0)
    event.remaining_budget = budget_val - total_spent
    event.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Budget updated", "event": event.to_dict()}), 200


@events_bp.route("/<int:event_id>/vendor-agreements", methods=["GET"])
@jwt_required()
def get_vendor_agreements(event_id):
    """List vendor agreements for event."""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    agreements = EventVendorAgreement.query.filter_by(event_id=event_id).all()
    return jsonify({"vendor_agreements": [a.to_dict() for a in agreements]}), 200


@events_bp.route("/<int:event_id>/vendor-agreements", methods=["PUT"])
@jwt_required()
def upsert_vendor_agreements(event_id):
    """Upsert agreed_price, service_type for vendor(s). Body: { agreements: [{ vendor_id, agreed_price, service_type? }] }"""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    data = request.get_json() or {}
    agreements_data = data.get("agreements", [])
    if not agreements_data:
        return jsonify({"error": "agreements array required"}), 400

    results = []
    for item in agreements_data:
        vendor_id = item.get("vendor_id")
        agreed_price = item.get("agreed_price")
        service_type = item.get("service_type") or "General"
        if vendor_id is None or agreed_price is None:
            continue
        try:
            agreed_price = float(agreed_price)
        except (TypeError, ValueError):
            continue
        if agreed_price <= 0:
            continue
        vendor = User.query.get(vendor_id)
        if not vendor or vendor.role != "vendor":
            continue
        if event not in vendor.assigned_events:
            continue

        existing = EventVendorAgreement.query.filter_by(event_id=event_id, vendor_id=vendor_id).first()
        if existing:
            existing.agreed_price = agreed_price
            existing.service_type = service_type
            results.append(existing.to_dict())
        else:
            new_agreement = EventVendorAgreement(
                event_id=event_id,
                vendor_id=vendor_id,
                agreed_price=agreed_price,
                service_type=service_type,
                payment_status="pending",
            )
            db.session.add(new_agreement)
            db.session.flush()
            results.append(new_agreement.to_dict())

    event.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"vendor_agreements": results}), 200


@events_bp.route("/<int:event_id>/vendor-agreements/<int:agreement_id>", methods=["PATCH"])
@jwt_required()
def update_vendor_agreement(event_id, agreement_id):
    """Update a single vendor agreement (agreed_price, service_type)."""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    agreement = EventVendorAgreement.query.filter_by(
        id=agreement_id, event_id=event_id
    ).first()
    if not agreement:
        return jsonify({"error": "Vendor agreement not found"}), 404

    data = request.get_json() or {}
    if "agreed_price" in data:
        try:
            val = float(data["agreed_price"])
            if val <= 0:
                return jsonify({"error": "agreed_price must be positive"}), 400
            agreement.agreed_price = val
        except (TypeError, ValueError):
            return jsonify({"error": "agreed_price must be a number"}), 400
    if "service_type" in data:
        agreement.service_type = (data["service_type"] or "General").strip() or "General"

    event.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"vendor_agreement": agreement.to_dict()}), 200


@events_bp.route("/<int:event_id>/vendor-agreements/<int:agreement_id>", methods=["DELETE"])
@jwt_required()
def delete_vendor_agreement(event_id, agreement_id):
    """Delete a vendor agreement. Only allowed if no advance/final payments recorded for this vendor."""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    agreement = EventVendorAgreement.query.filter_by(
        id=agreement_id, event_id=event_id
    ).first()
    if not agreement:
        return jsonify({"error": "Vendor agreement not found"}), 404

    has_payments = Payment.query.filter_by(
        event_id=event_id, vendor_id=agreement.vendor_id, status="completed"
    ).filter(Payment.payment_type.in_(["advance", "final"])).first()
    if has_payments:
        return jsonify({
            "error": "Cannot remove agreement: payments have already been recorded for this vendor. Remove or adjust payments first."
        }), 400

    db.session.delete(agreement)
    event.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Vendor agreement removed"}), 200


@events_bp.route("/<int:event_id>/payments", methods=["GET"])
@jwt_required()
def get_event_payments(event_id):
    """Payment history for event (for Budget Planner)."""
    user_id = get_jwt_identity()
    event = _get_event_for_budget(event_id, user_id)
    if not event:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    payments = Payment.query.filter_by(event_id=event_id).order_by(Payment.created_at.desc()).all()
    return jsonify({"payments": [p.to_dict() for p in payments]}), 200
