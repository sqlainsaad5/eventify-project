from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity  # ✅ ADD THIS IMPORT
from app.models import User, Event, db
from app.extensions import jwt

vendors_bp = Blueprint("vendors", __name__, url_prefix="/api/vendors")


# ✅ Get all vendors
@vendors_bp.route("", methods=["GET"])
@jwt_required()
def get_vendors():
    try:
        vendors = User.query.filter_by(role="vendor").all()
        vendor_list = []
        for v in vendors:
            vendor_list.append({
                "id": v.id,
                "name": v.name,
                "email": v.email,
                "category": getattr(v, "category", "General"),
                "phone": getattr(v, "phone", "N/A"),
                "city": getattr(v, "city", "Unknown"),
                "profile_image": getattr(v, "profile_image", ""),
                "rating": 4.5,
                "assigned_events": [event.to_dict() for event in v.assigned_events],
                "assigned_events_count": len(v.assigned_events)
            })
        return jsonify(vendor_list), 200
    except Exception as e:
        print(f"❌ Error fetching vendors: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# ✅ Assign vendor to event (supports multiple events)
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

        # Check if vendor is already assigned to this event
        if event in vendor.assigned_events:
            return jsonify({"error": f"Vendor '{vendor.name}' is already assigned to '{event.name}'"}), 400

        # Assign vendor to event (many-to-many)
        vendor.assigned_events.append(event)
        db.session.commit()

        # Notify Vendor
        try:
            from app.api.payments import create_notification
            create_notification(
                vendor_id,
                "🎉 New Event Assignment",
                f"You have been assigned to the event '{event.name}'.",
                "info",
                {"event_id": event_id}
            )
        except Exception as e:
            print(f"Assign notification failed: {e}")

        return jsonify({
            "message": f"✅ Vendor '{vendor.name}' successfully assigned to '{event.name}'",
            "assigned_events_count": len(vendor.assigned_events)
        }), 200

    except Exception as e:
        print(f"❌ Error assigning vendor: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    
    # ✅ Unassign vendor from event
@vendors_bp.route("/unassign", methods=["POST"])
def unassign_vendor():
    try:
        data = request.get_json()
        vendor_id = data.get("vendor_id")
        event_id = data.get("event_id")

        vendor = User.query.get(vendor_id)
        event = Event.query.get(event_id)

        if not vendor or not event:
            return jsonify({"error": "Vendor or event not found"}), 404

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
    


# ✅ Get assigned event for a vendor
# Add these routes to your existing vendors.py

@vendors_bp.route("/assigned_events/<int:vendor_id>", methods=["GET"])
@jwt_required()
def get_assigned_events(vendor_id):
    """Get assigned events with completion status"""
    try:
        current_user_id = get_jwt_identity()
        
        if int(vendor_id) != int(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        vendor = User.query.get(vendor_id)
        if not vendor:
            return jsonify({"error": "Vendor not found"}), 404
        
        assigned_events = []
        for event in vendor.assigned_events:
            # ✅ CHECK IF EVENT IS COMPLETED BY THIS VENDOR
            is_completed = event in vendor.completed_events
            
            assigned_events.append({
                "id": event.id,
                "name": event.name,
                "date": event.date,
                "venue": event.venue,
                "budget": event.budget,
                "status": "completed" if is_completed else "assigned",
                "organizer_id": event.user_id
            })
        
        return jsonify({
            "assigned_events": assigned_events
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@vendors_bp.route("/<int:vendor_id>/bookings", methods=["GET"])
@jwt_required()
def get_vendor_bookings(vendor_id):
    """Get vendor's bookings (compatibility with frontend)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify vendor is accessing their own data
        if int(vendor_id) != int(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        vendor = User.query.get(vendor_id)
        if not vendor:
            return jsonify({"error": "Vendor not found"}), 404
        
        # Return assigned events as bookings for compatibility
        assigned_events = vendor.assigned_events
        
        bookings = []
        for event in assigned_events:
            organizer = User.query.get(event.user_id)
            bookings.append({
                "id": event.id,
                "eventName": event.name,
                "date": event.date,
                "client": organizer.name if organizer else "Organizer",
                "status": "confirmed",  # Default status
                "budget": f"${event.budget}"
            })
        
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
        
        # Check if vendor is assigned to this event
        if event not in vendor.assigned_events:
            return jsonify({"error": "Not assigned to this event"}), 403
        
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
        
        # Notify Organizer
        try:
            from app.api.payments import create_notification
            create_notification(
                event.user_id,
                "✅ Event Task Completed",
                f"Vendor '{vendor.name}' has marked their work for '{event.name}' as completed.",
                "success",
                {"event_id": event.id, "vendor_id": vendor.id}
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


@vendors_bp.route("/<int:vendor_id>", methods=["GET"])
@jwt_required()  # ✅ ADD JWT PROTECTION
def get_vendor(vendor_id):
    try:
        vendor = User.query.get(vendor_id)
        
        if not vendor or vendor.role != "vendor":
            return jsonify({"error": "Vendor not found"}), 404
            
        vendor_data = vendor.to_dict()
        vendor_data["assigned_events_count"] = len(vendor.assigned_events)
        vendor_data["assigned_events"] = [event.to_dict() for event in vendor.assigned_events]
        
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
                "assigned_events_count": len(v.assigned_events)
            }
            for v in vendors
        ]), 200
    except Exception as e:
        print(f"❌ Error fetching available vendors: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500