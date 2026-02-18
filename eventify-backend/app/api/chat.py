from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import ChatMessage, User, Event, db
from datetime import datetime
from sqlalchemy import or_, and_

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

# ✅ Send message
@chat_bp.route("/send", methods=["POST"])
@jwt_required()
def send_message():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        event_id = data.get('event_id')
        receiver_id = data.get('receiver_id')
        message = data.get('message')
        
        if not all([event_id, receiver_id, message]):
            return jsonify({"error": "Event ID, receiver ID and message are required"}), 400
        
        # Verify event exists
        event = Event.query.get(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        # Create chat message - SPECIFIC TO THIS EVENT
        chat_message = ChatMessage(
            sender_id=current_user_id,
            receiver_id=receiver_id,
            event_id=event_id,  # ✅ This ensures message is tied to specific event
            message=message.strip()
        )
        
        db.session.add(chat_message)
        db.session.commit()
        
        return jsonify({
            "message": "Message sent successfully",
            "chat_message": chat_message.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {str(e)}")
        return jsonify({"error": "Failed to send message"}), 500
# ✅ Get chat messages for an event
# ✅ Get chat messages for an event - FIXED ACCESS CONTROL
@chat_bp.route("/event/<int:event_id>", methods=["GET"])
@jwt_required()
def get_event_messages(event_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Verify event exists
        event = Event.query.get(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        # Get messages ONLY for this specific event
        messages = ChatMessage.query.filter_by(event_id=event_id)\
            .order_by(ChatMessage.created_at.asc())\
            .all()
        
        return jsonify({
            "messages": [msg.to_dict() for msg in messages],
            "event_name": event.name
        }), 200
        
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        return jsonify({"error": "Failed to fetch messages"}), 500
        messages = ChatMessage.query.filter_by(event_id=event_id)\
            .order_by(ChatMessage.created_at.asc())\
            .all()
        
        return jsonify({
            "messages": [msg.to_dict() for msg in messages],
            "event_name": event.name
        }), 200
        
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        return jsonify({"error": "Failed to fetch messages"}), 500

# ✅ Get vendor's chat conversations
@chat_bp.route("/vendor/conversations", methods=["GET"])
@jwt_required()
def get_vendor_conversations():
    try:
        current_user_id = get_jwt_identity()
        
        vendor = User.query.get(current_user_id)
        if not vendor or vendor.role != 'vendor':
            return jsonify({"error": "Vendor not found"}), 404
        
        assigned_events = vendor.assigned_events
        
        conversations = []
        for event in assigned_events:
            # Get organizer info
            organizer = User.query.get(event.user_id)
            if not organizer:
                continue
            
            # Get last message for this SPECIFIC event
            last_message = ChatMessage.query.filter_by(event_id=event.id)\
                .order_by(ChatMessage.created_at.desc())\
                .first()
            
            # Count unread messages FOR THIS SPECIFIC EVENT
            unread_count = ChatMessage.query.filter_by(
                event_id=event.id,
                receiver_id=current_user_id,
                is_read=False
            ).count()
            
            conversations.append({
                "event_id": event.id,
                "event_name": event.name,
                "organizer_id": organizer.id,
                "organizer_name": organizer.name,
                "organizer_email": organizer.email,
                "last_message": last_message.message if last_message else "No messages yet",
                "last_message_time": last_message.created_at.isoformat() if last_message else None,
                "unread_count": unread_count
            })
        
        return jsonify({"conversations": conversations}), 200
        
    except Exception as e:
        print(f"Error fetching vendor conversations: {str(e)}")
        return jsonify({"error": "Failed to fetch conversations"}), 500


# ✅ Get organizer's chat conversations
@chat_bp.route("/organizer/conversations", methods=["GET"])
@jwt_required()
def get_organizer_conversations():
    try:
        current_user_id = get_jwt_identity()
        
        # Get all events created by this organizer
        organizer_events = Event.query.filter_by(user_id=current_user_id).all()
        
        conversations = []
        for event in organizer_events:
            # Get vendors assigned to this event
            assigned_vendors = event.assigned_vendors
            
            for vendor in assigned_vendors:
                # Get last message for this SPECIFIC event with vendor
                last_message = ChatMessage.query.filter_by(
                    event_id=event.id
                ).filter(
                    (ChatMessage.sender_id == vendor.id) | 
                    (ChatMessage.sender_id == current_user_id)
                ).order_by(ChatMessage.created_at.desc()).first()
                
                # Count unread messages from vendor to organizer FOR THIS EVENT
                unread_count = ChatMessage.query.filter_by(
                    event_id=event.id,
                    sender_id=vendor.id,
                    receiver_id=current_user_id,
                    is_read=False
                ).count()
                
                conversations.append({
                    "event_id": event.id,
                    "event_name": event.name,
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "vendor_email": vendor.email,
                    "last_message": last_message.message if last_message else "No messages yet",
                    "last_message_time": last_message.created_at.isoformat() if last_message else None,
                    "unread_count": unread_count
                })
        
        return jsonify({"conversations": conversations}), 200
        
    except Exception as e:
        print(f"Error fetching organizer conversations: {str(e)}")
        return jsonify({"error": "Failed to fetch conversations"}), 500


# ✅ Mark messages as read
@chat_bp.route("/mark-read", methods=["PUT"])
@jwt_required()
def mark_messages_read():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        event_id = data.get('event_id')
        
        if not event_id:
            return jsonify({"error": "Event ID is required"}), 400
        
        # Mark all messages in this event as read for current user
        unread_messages = ChatMessage.query.filter_by(
            event_id=event_id,
            receiver_id=current_user_id,
            is_read=False
        ).all()
        
        for msg in unread_messages:
            msg.is_read = True
        
        db.session.commit()
        
        return jsonify({
            "message": f"Marked {len(unread_messages)} messages as read",
            "marked_count": len(unread_messages)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error marking messages as read: {str(e)}")
        return jsonify({"error": "Failed to mark messages as read"}), 500

# ✅ Get conversation between two users for an event
@chat_bp.route("/conversation/<int:event_id>/<int:other_user_id>", methods=["GET"])
@jwt_required()
def get_conversation(event_id, other_user_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Verify access to event
        event = Event.query.get(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        user = User.query.get(current_user_id)
        has_access = False
        
        if user.role == 'organizer' and event.user_id == current_user_id:
            has_access = True
        elif user.role == 'vendor' and event in user.assigned_events:
            has_access = True
            
        if not has_access:
            return jsonify({"error": "Access denied"}), 403
        
        # Get messages between current user and other user for this event
        messages = ChatMessage.query.filter(
            ChatMessage.event_id == event_id,
            or_(
                and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == other_user_id),
                and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == current_user_id)
            )
        ).order_by(ChatMessage.created_at.asc()).all()
        
        return jsonify({
            "messages": [msg.to_dict() for msg in messages],
            "event_name": event.name
        }), 200
        
    except Exception as e:
        print(f"Error fetching conversation: {str(e)}")
        return jsonify({"error": "Failed to fetch conversation"}), 500