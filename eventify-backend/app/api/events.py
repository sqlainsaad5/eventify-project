from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Event, User
import os
import uuid
from openai import OpenAI

events_bp = Blueprint("events", __name__, url_prefix="/api/events")

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
    events = Event.query.filter_by(user_id=user_id).all()
    return jsonify([e.to_dict() for e in events]), 200


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

        event = Event(
            name=data["name"].strip(),
            date=data["date"],
            venue=data["venue"].strip(),
            vendor_category=data["vendor_category"],
            budget=budget,
            image_url=image_url,
            user_id=user_id,
            progress=0
        )

        db.session.add(event)
        db.session.commit()

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


# ✅ Update existing event
@events_bp.route("/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id):
    try:
        user_id = get_jwt_identity()
        event = Event.query.filter_by(id=event_id, user_id=user_id).first()

        if not event:
            return jsonify({"error": "Event not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        for field in ["name", "date", "venue", "vendor_category", "budget"]:
            if field in data and str(data[field]).strip():
                setattr(event, field, data[field])

        db.session.commit()
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
        organizer = User.query.get(user_id)
        if not organizer:
            return jsonify({"error": "Organizer not found"}), 404

        data = request.get_json()
        vendor_id = data.get("vendor_id")
        if not vendor_id:
            return jsonify({"error": "Vendor ID required"}), 400

        vendor = User.query.get(vendor_id)
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Vendor not found"}), 404

        event = Event.query.filter_by(id=event_id, user_id=user_id).first()
        if not event:
            return jsonify({"error": "Event not found or not owned by you"}), 404

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

        # ✅ Unassign all vendors (for dynamic relationship)
        for vendor in event.assigned_vendors.all():
            event.assigned_vendors.remove(vendor)

        db.session.delete(event)
        db.session.commit()

        return jsonify({"message": "Event deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error deleting event: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ✅ Get venue suggestions (Dynamic)
@events_bp.route("/venue-suggestions", methods=["GET"])
@jwt_required()
def get_venue_suggestions():
    try:
        query = request.args.get('q', '').lower().strip()
        
        if len(query) < 2:
            return jsonify({"suggestions": []})
        
        # Sample venues database (you can expand this later)
        pakistani_venues = [
            "Expo Center Lahore", "Pearl Continental Hotel Karachi", 
            "Serena Hotel Islamabad", "Lahore Expo Centre", 
            "Karachi Expo Center", "Punjab Stadium Lahore",
            "National Stadium Karachi", "Jinnah Convention Center Islamabad",
            "Alhamra Arts Council Lahore", "Frere Hall Karachi", 
            "PC Hotel Lahore", "Marriott Hotel Islamabad", 
            "Avari Hotel Lahore", "Mövenpick Hotel Karachi",
            "Royal Palm Golf Club Lahore", "Beach Luxury Hotel Karachi", 
            "Islamabad Club", "Lahore Gymkhana", "Karachi Golf Club",
            "PAF Museum Karachi", "Lahore Museum", 
            "Pakistan National Council of Arts Islamabad",
            "Convention Center Peshawar", "Bacha Khan Center Peshawar"
        ]
        
        # Filter venues based on query
        suggestions = [venue for venue in pakistani_venues if query in venue.lower()]
        
        return jsonify({
            "suggestions": suggestions[:10]  # Return top 10 results
        })

    except Exception as e:
        print(f"❌ Error in venue suggestions: {e}")
        return jsonify({"suggestions": []})
