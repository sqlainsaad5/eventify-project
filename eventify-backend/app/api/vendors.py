from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity  # ✅ ADD THIS IMPORT
from app.models import User, Event, db, VendorEventVerification, PaymentRequest
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
            accepted_events = [e for e in v.assigned_events if e.organizer_id and e.organizer_status == 'accepted']
            assigned_events_with_status = []
            for event in accepted_events:
                ev_dict = event.to_dict()
                ev_dict["completed"] = event in v.completed_events
                ev_dict["verified"] = VendorEventVerification.query.filter_by(
                    event_id=event.id, vendor_id=v.id
                ).first() is not None
                assigned_events_with_status.append(ev_dict)
            vendor_list.append({
                "id": v.id,
                "name": v.name,
                "email": v.email,
                "category": getattr(v, "category", "General"),
                "phone": getattr(v, "phone", "N/A"),
                "city": getattr(v, "city", "Unknown"),
                "profile_image": getattr(v, "profile_image", ""),
                "rating": 4.5,
                "assigned_events": assigned_events_with_status,
                "assigned_events_count": len(accepted_events),
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

        # ✅ Professional Hierarchy Check: ONLY the assigned organizer can hire vendors.
        # Direct assignment by the project owner (User) is prohibited to maintain organizational flow.
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if event.organizer_id != current_user_id:
            return jsonify({
                "error": "Unauthorized: Only the assigned professional organizer can manage vendor partnerships for this event."
            }), 403
            
        if user.role != "organizer":
            return jsonify({"error": "Unauthorized: Only users with the 'organizer' role can perform this action."}), 403

        # Check if vendor is already assigned to this event
        if event in vendor.assigned_events:
            return jsonify({"error": f"Vendor '{vendor.name}' is already assigned to '{event.name}'"}), 400

        # Assign vendor to event (many-to-many)
        vendor.assigned_events.append(event)
        db.session.commit()

        # Notify Vendor (Dual Notification for Assignment & Booking)
        try:
            from app.api.payments import create_notification
            # 1. Assignment Notification (The "Fine" one)
            create_notification(
                vendor_id,
                "🎉 New Event Assignment",
                f"You have been assigned to the event '{event.name}'.",
                "info",
                {"event_id": event_id}
            )
            # 2. Booking Notification (The New one)
            create_notification(
                vendor_id,
                "📅 New Event Booking",
                f"You have a new booking request for '{event.name}'. Check your bookings for details.",
                "success",
                {"event_id": event_id, "type": "booking"}
            )
        except Exception as e:
            print(f"Assignment/Booking notifications failed: {e}")

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
    


# ✅ Get assigned event for a vendor
# Add these routes to your existing vendors.py

@vendors_bp.route("/assigned_events/<int:vendor_id>", methods=["GET"])
@jwt_required()
def get_assigned_events(vendor_id):
    """Get assigned events with completion status (Filtered by Organizer Acceptance)"""
    try:
        current_user_id = get_jwt_identity()
        
        if int(vendor_id) != int(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        vendor = User.query.get(vendor_id)
        if not vendor:
            return jsonify({"error": "Vendor not found"}), 404
        
        assigned_events = []
        for event in vendor.assigned_events:
            # ✅ EXCLUSIVITY LOCK: Vendors only see events where a professional organizer is in charge AND has accepted.
            # This follows the principle: "Whatever has been assigned to someone, only that person should be able to see it."
            if not event.organizer_id or event.organizer_status != 'accepted':
                continue

            is_completed = event in vendor.completed_events
            verification = VendorEventVerification.query.filter_by(
                event_id=event.id, vendor_id=current_user_id
            ).first()
            is_verified = verification is not None
            pr = PaymentRequest.query.filter_by(
                event_id=event.id, vendor_id=int(current_user_id)
            ).first()
            payment_request_status = pr.status if pr else None

            assigned_events.append({
                "id": event.id,
                "name": event.name,
                "date": event.date,
                "venue": event.venue,
                "budget": event.budget,
                "status": "completed" if is_completed else "assigned",
                "organizer_id": event.organizer_id,
                "verified": is_verified,
                "payment_request_status": payment_request_status,
            })
        
        return jsonify({
            "assigned_events": assigned_events
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
            # ✅ EXCLUSIVITY LOCK: Only show fully vetted projects
            if not event.organizer_id or event.organizer_status != 'accepted':
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

        verified_events = [e for e in vendor.assigned_events if e.organizer_id and e.organizer_status == 'accepted']
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
                "assigned_events_count": len([e for e in v.assigned_events if e.organizer_id and e.organizer_status == 'accepted'])
            }
            for v in vendors
        ]), 200
    except Exception as e:
        print(f"❌ Error fetching available vendors: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500