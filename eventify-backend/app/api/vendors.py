from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity  # ✅ ADD THIS IMPORT
from sqlalchemy import func, and_, insert, update

from app.models import (
    User,
    Event,
    db,
    VendorEventVerification,
    PaymentRequest,
    Review,
    vendor_events,
    get_vendor_event_partnership_status,
)
from app.extensions import jwt

vendors_bp = Blueprint("vendors", __name__, url_prefix="/api/vendors")


# ✅ Get all vendors
@vendors_bp.route("", methods=["GET"])
@jwt_required()
def get_vendors():
    try:
        current_user_id = int(get_jwt_identity())
        current_user = User.query.get(current_user_id)
        if not current_user:
            return jsonify({"error": "User not found"}), 404

        vendors = User.query.filter_by(role="vendor").all()
        vendor_list = []
        for v in vendors:
            # For organizers: show all vendors; list events for this organizer with
            # partnership status (pending / accepted / rejected).
            if current_user.role == "organizer":
                org_events = [
                    e for e in v.assigned_events
                    if e.organizer_id == current_user_id and e.organizer_status == "accepted"
                ]
            else:
                org_events = [
                    e for e in v.assigned_events
                    if e.organizer_id and e.organizer_status == "accepted"
                ]

            assigned_events_with_status = []
            for event in org_events:
                ev_dict = event.to_dict()
                ev_dict["completed"] = event in v.completed_events
                ev_dict["verified"] = VendorEventVerification.query.filter_by(
                    event_id=event.id, vendor_id=v.id
                ).first() is not None
                row = (
                    db.session.query(
                        vendor_events.c.partnership_status,
                        vendor_events.c.assigned_at,
                        vendor_events.c.partnership_confirmed_at,
                    )
                    .filter(
                        vendor_events.c.vendor_id == v.id,
                        vendor_events.c.event_id == event.id,
                    )
                    .first()
                )
                if row:
                    ev_dict["partnership_status"] = row[0] or "accepted"
                    ev_dict["assigned_at"] = row[1].isoformat() if row[1] else None
                    ev_dict["partnership_confirmed_at"] = (
                        row[2].isoformat() if row[2] else None
                    )
                else:
                    ev_dict["partnership_status"] = "accepted"
                    ev_dict["assigned_at"] = None
                    ev_dict["partnership_confirmed_at"] = None
                assigned_events_with_status.append(ev_dict)

            confirmed = sum(
                1 for d in assigned_events_with_status
                if d.get("partnership_status") == "accepted"
            )
            pending_n = sum(
                1 for d in assigned_events_with_status
                if d.get("partnership_status") == "pending"
            )
            avg_row = (
                db.session.query(func.avg(Review.rating), func.count(Review.id))
                .filter(
                    Review.subject_id == v.id,
                    Review.review_type == "organizer_to_vendor",
                    Review.status == "published",
                )
                .one()
            )
            avg_r, cnt_r = avg_row[0], avg_row[1]
            rating_avg = round(float(avg_r), 2) if avg_r is not None else None
            vendor_list.append({
                "id": v.id,
                "name": v.name,
                "email": v.email,
                "category": getattr(v, "category", "General"),
                "phone": getattr(v, "phone", "N/A"),
                "city": getattr(v, "city", "Unknown"),
                "profile_image": getattr(v, "profile_image", ""),
                "rating": rating_avg,
                "rating_count": int(cnt_r or 0),
                "assigned_events": assigned_events_with_status,
                "assigned_events_count": confirmed,
                "pending_partnership_count": pending_n,
            })
        return jsonify(vendor_list), 200
    except Exception as e:
        print(f"❌ Error fetching vendors: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# ✅ Partnership request: organizer requests vendor; vendor must accept before confirmed.
@vendors_bp.route("/assign", methods=["POST"])
@jwt_required()
def assign_vendor():
    try:
        data = request.get_json()
        vendor_id = data.get("vendor_id")
        event_id = data.get("event_id")

        vendor = User.query.get(vendor_id)
        event = Event.query.get(event_id)

        if not vendor or not event:
            return jsonify({"error": "Vendor or event not found"}), 404

        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if event.organizer_id != current_user_id:
            return jsonify({
                "error": "Unauthorized: Only the assigned professional organizer can manage vendor partnerships for this event."
            }), 403
            
        if user.role != "organizer":
            return jsonify({"error": "Unauthorized: Only users with the 'organizer' role can perform this action."}), 403

        if event.status not in ("advance_payment_completed", "vendor_assigned"):
            return jsonify({
                "error": "Advance payment must be completed before sending vendor partnership requests for this event."
            }), 403

        if vendor.role != "vendor":
            return jsonify({"error": "Invalid vendor"}), 400

        link_status = get_vendor_event_partnership_status(vendor_id, event_id)
        if link_status == "accepted":
            return jsonify({
                "error": f"Vendor '{vendor.name}' is already partnered for '{event.name}'."
            }), 400
        if link_status == "pending":
            return jsonify({
                "error": f"A partnership request to '{vendor.name}' for this event is already pending."
            }), 400
        if link_status == "rejected":
            db.session.execute(
                update(vendor_events)
                .where(
                    and_(
                        vendor_events.c.vendor_id == vendor_id,
                        vendor_events.c.event_id == event_id,
                    )
                )
                .values(
                    partnership_status="pending",
                    partnership_confirmed_at=None,
                )
            )
        else:
            db.session.execute(
                insert(vendor_events).values(
                    vendor_id=vendor_id,
                    event_id=event_id,
                    partnership_status="pending",
                )
            )
        db.session.commit()
        # Refresh relationship cache
        db.session.expire(vendor)

        try:
            from app.api.payments import create_notification
            create_notification(
                vendor_id,
                "🤝 New partnership request",
                f"Organizer invited you to partner on the event “{event.name}”. Open your vendor dashboard to accept or decline.",
                "info",
                {"event_id": event_id, "type": "partnership_request"},
            )
        except Exception as e:
            print(f"Partnership request notification failed: {e}")

        return jsonify({
            "message": f"Partnership request sent to {vendor.name} for “{event.name}”.",
            "partnership_status": "pending",
        }), 200

    except Exception as e:
        print(f"❌ Error assigning vendor: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@vendors_bp.route("/partnership/accept", methods=["POST"])
@jwt_required()
def accept_partnership():
    """Vendor confirms a pending partnership for an event."""
    try:
        data = request.get_json() or {}
        event_id = data.get("event_id")
        if not event_id:
            return jsonify({"error": "event_id is required"}), 400
        current_user_id = int(get_jwt_identity())
        vendor = User.query.get(current_user_id)
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Only vendor accounts can accept a partnership request"}), 403

        if get_vendor_event_partnership_status(current_user_id, int(event_id)) != "pending":
            return jsonify({"error": "No pending partnership request for this event"}), 400

        event = Event.query.get(int(event_id))
        if not event or not event.organizer_id or event.organizer_status != "accepted":
            return jsonify({"error": "Event is not available for this partnership"}), 404

        now = datetime.utcnow()
        db.session.execute(
            update(vendor_events)
            .where(
                and_(
                    vendor_events.c.vendor_id == current_user_id,
                    vendor_events.c.event_id == int(event_id),
                    vendor_events.c.partnership_status == "pending",
                )
            )
            .values(partnership_status="accepted", partnership_confirmed_at=now)
        )
        if event.status == "advance_payment_completed":
            event.status = "vendor_assigned"
        db.session.commit()
        try:
            from app.api.payments import create_notification
            organizer_id = event.organizer_id
            if organizer_id:
                create_notification(
                    organizer_id,
                    "✅ Partnership confirmed",
                    f"{vendor.name or 'Vendor'} accepted the partnership for “{event.name}”.",
                    "success",
                    {"event_id": event_id, "vendor_id": current_user_id},
                )
        except Exception as e:
            print(f"Accept partnership notification: {e}")
        return jsonify({
            "message": "Partnership confirmed. You are now connected to this event.",
            "partnership_status": "accepted",
            "event_id": int(event_id),
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"accept_partnership: {e}")
        return jsonify({"error": "Internal server error"}), 500


@vendors_bp.route("/partnership/decline", methods=["POST"])
@jwt_required()
def decline_partnership():
    """Vendor declines a pending partnership request (organizer may request again later)."""
    try:
        data = request.get_json() or {}
        event_id = data.get("event_id")
        if not event_id:
            return jsonify({"error": "event_id is required"}), 400
        current_user_id = int(get_jwt_identity())
        vendor = User.query.get(current_user_id)
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Only vendor accounts can decline a partnership request"}), 403
        if get_vendor_event_partnership_status(current_user_id, int(event_id)) != "pending":
            return jsonify({"error": "No pending partnership request for this event"}), 400
        event = Event.query.get(int(event_id))
        if not event:
            return jsonify({"error": "Event not found"}), 404
        now = datetime.utcnow()
        db.session.execute(
            update(vendor_events)
            .where(
                and_(
                    vendor_events.c.vendor_id == current_user_id,
                    vendor_events.c.event_id == int(event_id),
                    vendor_events.c.partnership_status == "pending",
                )
            )
            .values(partnership_status="rejected", partnership_confirmed_at=now)
        )
        db.session.commit()
        try:
            from app.api.payments import create_notification
            if event.organizer_id:
                create_notification(
                    event.organizer_id,
                    "Partnership request declined",
                    f"{vendor.name or 'A vendor'} declined the partnership for “{event.name}”.",
                    "warning",
                    {"event_id": int(event_id), "vendor_id": current_user_id},
                )
        except Exception as e:
            print(f"Decline partnership notification: {e}")
        return jsonify({"message": "Partnership request declined", "event_id": int(event_id)}), 200
    except Exception as e:
        db.session.rollback()
        print(f"decline_partnership: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ✅ Unassign vendor from event
@vendors_bp.route("/unassign", methods=["POST"])
@jwt_required()
def unassign_vendor():
    try:
        data = request.get_json()
        vendor_id = data.get("vendor_id")
        event_id = data.get("event_id")

        vendor = User.query.get(vendor_id)
        event = Event.query.get(event_id)

        if not vendor or not event:
            return jsonify({"error": "Vendor or event not found"}), 404
            
        # ✅ Professional Hierarchy Check: ONLY the assigned organizer can manage vendors.
        current_user_id = int(get_jwt_identity())
        if event.organizer_id != current_user_id:
            return jsonify({"error": "Unauthorized: Only the assigned professional organizer can manage this event's vendors"}), 403

        # Remove assignment
        if event in vendor.assigned_events:
            vendor.assigned_events.remove(event)
            db.session.commit()
            
            # Notify Vendor
            try:
                from app.api.payments import create_notification
                create_notification(
                    vendor_id,
                    "⚠️ Event Assignment Removed",
                    f"You have been removed from the event '{event.name}'.",
                    "warning",
                    {"event_id": event_id}
                )
            except Exception as e:
                print(f"Unassign notification failed: {e}")
                
            return jsonify({
                "message": f"✅ Vendor '{vendor.name}' unassigned from '{event.name}'",
                "assigned_events_count": len(vendor.assigned_events)
            }), 200
        else:
            return jsonify({"error": "Vendor is not assigned to this event"}), 400

    except Exception as e:
        print(f"❌ Error unassigning vendor: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    


def _sort_key_recent_row(row):
    a = row.get("partnership_confirmed_at")
    b = row.get("assigned_at")
    if a:
        return a
    if b:
        return b
    return ""


@vendors_bp.route("/assigned_events/<int:vendor_id>", methods=["GET"])
@jwt_required()
def get_assigned_events(vendor_id):
    """Confirmed partnerships + pending requests; recent-first."""
    try:
        current_user_id = get_jwt_identity()
        
        if int(vendor_id) != int(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        vendor = User.query.get(vendor_id)
        if not vendor:
            return jsonify({"error": "Vendor not found"}), 404
        
        partnership_requests = []
        assigned_events = []
        for event in vendor.assigned_events:
            if not event.organizer_id or event.organizer_status != "accepted":
                continue
            pstatus = get_vendor_event_partnership_status(int(vendor_id), event.id) or "accepted"
            row_meta = (
                db.session.query(
                    vendor_events.c.assigned_at,
                    vendor_events.c.partnership_confirmed_at,
                )
                .filter(
                    vendor_events.c.vendor_id == int(vendor_id),
                    vendor_events.c.event_id == event.id,
                )
                .first()
            )
            at_iso = row_meta[0].isoformat() if row_meta and row_meta[0] else None
            cf_iso = row_meta[1].isoformat() if row_meta and row_meta[1] else None
            organizer = User.query.get(event.organizer_id) if event.organizer_id else None
            base = {
                "id": event.id,
                "name": event.name,
                "date": event.date,
                "venue": event.venue,
                "budget": event.budget,
                "organizer_id": event.organizer_id,
                "organizer_name": organizer.name if organizer else None,
                "partnership_status": pstatus,
                "assigned_at": at_iso,
                "partnership_confirmed_at": cf_iso,
            }
            if pstatus == "pending":
                partnership_requests.append({**base, "status": "awaiting_your_response"})
            elif pstatus == "rejected":
                continue
            elif pstatus == "accepted":
                is_completed = event in vendor.completed_events
                verification = VendorEventVerification.query.filter_by(
                    event_id=event.id, vendor_id=current_user_id
                ).first()
                is_verified = verification is not None
                pr = PaymentRequest.query.filter_by(
                    event_id=event.id, vendor_id=int(vendor_id)
                ).first()
                payment_request_status = pr.status if pr else None
                assigned_events.append({
                    **base,
                    "status": "completed" if is_completed else "assigned",
                    "verified": is_verified,
                    "payment_request_status": payment_request_status,
                })

        partnership_requests.sort(key=_sort_key_recent_row, reverse=True)
        assigned_events.sort(key=_sort_key_recent_row, reverse=True)

        return jsonify({
            "partnership_requests": partnership_requests,
            "assigned_events": assigned_events,
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@vendors_bp.route("/<int:vendor_id>/bookings", methods=["GET"])
@jwt_required()
def get_vendor_bookings(vendor_id):
    """Get vendor's bookings (Filtered for professional exclusivity)"""
    try:
        current_user_id = get_jwt_identity()
        
        if int(vendor_id) != int(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        vendor = User.query.get(vendor_id)
        if not vendor:
            return jsonify({"error": "Vendor not found"}), 404
        
        bookings = []
        for event in vendor.assigned_events:
            if not event.organizer_id or event.organizer_status != "accepted":
                continue
            if get_vendor_event_partnership_status(int(vendor_id), event.id) != "accepted":
                continue

            is_completed = event in vendor.completed_events
            verification = VendorEventVerification.query.filter_by(
                event_id=event.id, vendor_id=vendor_id
            ).first()
            verified = verification is not None
            pr = PaymentRequest.query.filter_by(
                event_id=event.id, vendor_id=int(vendor_id)
            ).first()
            payment_request_status = pr.status if pr else None

            organizer = User.query.get(event.organizer_id)
            row_meta = (
                db.session.query(
                    vendor_events.c.assigned_at,
                    vendor_events.c.partnership_confirmed_at,
                )
                .filter(
                    vendor_events.c.vendor_id == int(vendor_id),
                    vendor_events.c.event_id == event.id,
                )
                .first()
            )
            at_iso = row_meta[0].isoformat() if row_meta and row_meta[0] else None
            cf_iso = row_meta[1].isoformat() if row_meta and row_meta[1] else None
            bookings.append({
                "id": event.id,
                "eventName": event.name,
                "date": event.date,
                "client": organizer.name if organizer else "Lead Organizer",
                "status": "confirmed",
                "budget": f"${event.budget}",
                "verified": verified,
                "completed": is_completed,
                "payment_request_status": payment_request_status,
                "assigned_at": at_iso,
                "partnership_confirmed_at": cf_iso,
            })
        bookings.sort(key=_sort_key_recent_row, reverse=True)
        return jsonify(bookings), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add this route to mark event as completed
# ✅ Mark event as completed for vendor
# ✅ Mark event as completed for vendor (Alternative approach)
# ✅ Mark event as completed for vendor (UPDATED)
# Add this to your vendors.py routes

# Add this route to your vendors.py blueprint

# Add this route to your vendors.py

@vendors_bp.route("/events/<int:event_id>/complete", methods=["PUT"])
@jwt_required()
def mark_event_completed(event_id):
    """Mark an event as completed by vendor"""
    try:
        current_user_id = get_jwt_identity()
        print(f"🔄 Marking event {event_id} as completed by vendor {current_user_id}")
        
        # Get the vendor
        vendor = User.query.get(current_user_id)
        if not vendor:
            return jsonify({"error": "Vendor not found"}), 404
        
        # Get the event
        event = Event.query.get(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        if event not in vendor.assigned_events:
            return jsonify({"error": "Not linked to this event"}), 403
        if get_vendor_event_partnership_status(int(current_user_id), int(event_id)) != "accepted":
            return jsonify({"error": "Partnership is not confirmed for this event yet"}), 403

        # ✅ Check if already completed
        if event in vendor.completed_events:
            return jsonify({
                "message": "Event already marked as completed",
                "event_id": event_id,
                "status": "completed"
            }), 200
        
        # ✅ Add to completed events
        vendor.completed_events.append(event)
        db.session.commit()
        
        # Notify organizer (fallback to event owner when no organizer is assigned)
        try:
            from app.api.payments import create_notification
            notify_user_id = event.organizer_id if event.organizer_id is not None else event.user_id
            create_notification(
                notify_user_id,
                "✅ Event Task Completed",
                f"Vendor '{vendor.name}' has marked their work for '{event.name}' as completed.",
                "success",
                {"event_id": event.id, "vendor_id": vendor.id, "action": "vendor_work_verification"}
            )
        except Exception as e:
            print(f"Completion notification failed: {e}")
        
        print(f"✅ Event {event_id} marked as completed for vendor {current_user_id}")
        
        return jsonify({
            "message": "Event marked as completed successfully",
            "event_id": event_id,
            "event_name": event.name,
            "status": "completed"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error marking event as completed: {str(e)}")
        return jsonify({"error": str(e)}), 500


@vendors_bp.route("/events/<int:event_id>/vendors/<int:vendor_id>/verify", methods=["PUT"])
@jwt_required()
def verify_vendor_work(event_id, vendor_id):
    """Organizer (or event owner) verifies vendor work for an event. Vendor must have marked event complete first."""
    try:
        current_user_id = int(get_jwt_identity())
        event = Event.query.get(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        if event.user_id != current_user_id and event.organizer_id != current_user_id:
            return jsonify({"error": "Unauthorized: Only event owner or assigned organizer can verify vendor work"}), 403

        vendor = User.query.get(vendor_id)
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Vendor not found"}), 404
        if event not in vendor.assigned_events:
            return jsonify({"error": "Vendor is not assigned to this event"}), 400
        if get_vendor_event_partnership_status(int(vendor_id), int(event_id)) != "accepted":
            return jsonify({"error": "Partnership must be confirmed before verification"}), 400
        if event not in vendor.completed_events:
            return jsonify({"error": "Vendor must mark the event as complete before organizer can verify"}), 400

        existing = VendorEventVerification.query.filter_by(event_id=event_id, vendor_id=vendor_id).first()
        if existing:
            return jsonify({
                "message": "Work already verified for this vendor",
                "event_id": event_id,
                "vendor_id": vendor_id,
                "verified": True,
            }), 200

        verification = VendorEventVerification(
            event_id=event_id,
            vendor_id=vendor_id,
            verified_by_id=current_user_id,
        )
        db.session.add(verification)
        db.session.commit()

        try:
            from app.api.payments import create_notification
            create_notification(
                vendor_id,
                "Work Verified",
                f"Your work for '{event.name}' has been verified by the organizer. You may request payment.",
                "success",
                {"event_id": event_id, "vendor_id": vendor_id},
            )
        except Exception as e:
            print(f"Verify notification failed: {e}")

        return jsonify({
            "message": "Vendor work verified successfully",
            "event_id": event_id,
            "vendor_id": vendor_id,
            "verified": True,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@vendors_bp.route("/<int:vendor_id>", methods=["GET"])
@jwt_required()  # ✅ ADD JWT PROTECTION
def get_vendor(vendor_id):
    try:
        vendor = User.query.get(vendor_id)
        
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Vendor not found"}), 404

        verified_events = [
            e for e in vendor.assigned_events
            if e.organizer_id
            and e.organizer_status == "accepted"
            and get_vendor_event_partnership_status(int(vendor_id), e.id) == "accepted"
        ]
        vendor_data = {
            "id": vendor.id,
            "name": vendor.name,
            "email": vendor.email,
            "category": getattr(vendor, "category", "General"),
            "phone": getattr(vendor, "phone", ""),
            "city": getattr(vendor, "city", ""),
            "profile_image": getattr(vendor, "profile_image", ""),
            "assigned_events_count": len(verified_events),
            "assigned_events": [event.to_dict() for event in verified_events],
        }
        return jsonify(vendor_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ Get only vendors with available capacity (optional filter)
@vendors_bp.route("/available", methods=["GET"])
def get_available_vendors():
    try:
        # You can add logic here to filter vendors by capacity if needed
        vendors = User.query.filter_by(role="vendor").all()
        return jsonify([
            {
                "id": v.id, 
                "name": v.name, 
                "category": v.category,
                "assigned_events_count": len(
                    [
                        e for e in v.assigned_events
                        if e.organizer_id
                        and e.organizer_status == "accepted"
                        and get_vendor_event_partnership_status(v.id, e.id) == "accepted"
                    ]
                ),
            }
            for v in vendors
        ]), 200
    except Exception as e:
        print(f"❌ Error fetching available vendors: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500