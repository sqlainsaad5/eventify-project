from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Event, db, PaymentRequest, Payment, OrganizerPaymentRequest, VendorEventVerification
from sqlalchemy import or_, and_
from datetime import datetime
import stripe
from app.config import Config

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")

# Initialize Stripe
stripe.api_key = Config.STRIPE_SECRET_KEY

# Notification storage (Simulated)
demo_notifications = []
notification_counter = 1

def create_notification(user_id, title, message, notification_type="info", extra_data=None):
    global notification_counter
    notification = {
        "id": notification_counter,
        "user_id": int(user_id),
        "title": title,
        "message": message,
        "type": notification_type,
        "is_read": False,
        "created_at": datetime.now().isoformat(),
        "extra_data": extra_data
    }
    demo_notifications.append(notification)
    notification_counter += 1
    return notification

# --- STRIPE CORE LOGIC ---

@payments_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature")
    endpoint_secret = Config.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        return jsonify({"error": "Webhook verification failed"}), 400

    if event["type"] == "payment_intent.succeeded":
        handle_payment_success(event["data"]["object"])
    elif event["type"] == "payment_intent.payment_failed":
        handle_payment_failure(event["data"]["object"])

    return jsonify({"status": "success"}), 200

def handle_payment_success(payment_intent):
    # Standardize metadata extraction (Stripe objects vs raw JSON dicts)
    if hasattr(payment_intent, 'metadata'):
        metadata = payment_intent.metadata
    else:
        metadata = payment_intent.get("metadata", {})
        
    payment_id = metadata.get("payment_id")
    request_id = metadata.get("request_id")
    organizer_request_id = metadata.get("organizer_request_id")

    print(f"💰 Processing successful payment context: payment_id={payment_id}, request_id={request_id}, organizer_request_id={organizer_request_id}")

    if payment_id:
        try:
            payment = Payment.query.get(int(payment_id))
            if payment:
                payment.status = "completed"
                payment.transaction_id = getattr(payment_intent, 'id', payment_intent.get('id', 'N/A'))
                payment.payment_date = datetime.now()

                if request_id:
                    pr = PaymentRequest.query.get(int(request_id))
                    if pr:
                        pr.status = 'paid'
                        print(f"✅ Vendor settlement (Request {request_id}) marked as PAID")
                        create_notification(
                            pr.vendor_id,
                            "💰 Payment Received!",
                            f"Your payment request for '{pr.event.name}' has been settled.",
                            "payment",
                            {"request_id": pr.id}
                        )

                if organizer_request_id:
                    opr = OrganizerPaymentRequest.query.get(int(organizer_request_id))
                    if opr:
                        opr.status = 'paid'
                        opr.paid_at = datetime.now()
                        opr.payment_id = payment.id
                        print(f"✅ Organizer request {organizer_request_id} marked as PAID")
                        create_notification(
                            opr.organizer_id,
                            "💰 Payment Received",
                            f"Your payment request for '{opr.event.name}' has been paid by the client.",
                            "payment",
                            {"organizer_request_id": opr.id}
                        )

                db.session.commit()
                print(f"✨ Payment {payment_id} marked as COMPLETED in database")
                create_notification(payment.event.user_id, "✅ Payment Verified", "Funds successfully processed via Stripe.", "success")
                return True
            else:
                print(f"❌ Payment ID {payment_id} not found in database")
        except Exception as e:
            print(f"❌ Error updating payment: {str(e)}")
            db.session.rollback()
    return False

def handle_payment_failure(payment_intent):
    if hasattr(payment_intent, 'metadata'):
        metadata = payment_intent.metadata
    else:
        metadata = payment_intent.get("metadata", {})
        
    payment_id = metadata.get("payment_id")
    if payment_id:
        payment = Payment.query.get(int(payment_id))
        if payment:
            payment.status = "failed"
            db.session.commit()
            print(f"⚠️ Payment {payment_id} marked as FAILED")

@payments_bp.route("/create-payment-intent", methods=["POST"])
@jwt_required()
def create_payment_intent():
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        event_id = data.get('event_id')
        amount = data.get('amount')
        request_id = data.get('request_id')  # Optional: for vendor settlement
        organizer_request_id = data.get('organizer_request_id')  # Optional: owner paying organizer

        print(f"🔄 Creating intent for Event {event_id}, Amount {amount}, request_id={request_id}, organizer_request_id={organizer_request_id}")

        event = Event.query.get(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        if organizer_request_id:
            opr = OrganizerPaymentRequest.query.get(organizer_request_id)
            if not opr:
                return jsonify({"error": "Organizer payment request not found"}), 404
            if opr.event_id != event_id or opr.status != 'pending':
                return jsonify({"error": "Invalid or already paid organizer request"}), 400
            if event.user_id != current_user_id:
                return jsonify({"error": "Only the event owner can pay the organizer"}), 403
            amount = float(opr.amount)
        elif request_id:
            pr = PaymentRequest.query.get(request_id)
            if not pr:
                return jsonify({"error": "Payment request not found"}), 404
            if pr.event_id != event_id or pr.status != 'approved':
                return jsonify({"error": "Invalid or not approved payment request"}), 400
            if event.user_id != current_user_id and event.organizer_id != current_user_id:
                return jsonify({"error": "Unauthorized: only event owner or organizer can settle this request"}), 403
        else:
            if event.user_id != current_user_id:
                return jsonify({"error": "Event not found"}), 404

        payment = Payment(
            event_id=event_id,
            amount=float(amount),
            currency="USD",
            status="pending",
            payment_method="card"
        )
        db.session.add(payment)
        db.session.commit()

        meta = {
            "payment_id": str(payment.id),
            "event_id": str(event_id),
            "user_id": str(current_user_id)
        }
        if request_id:
            meta["request_id"] = str(request_id)
        if organizer_request_id:
            meta["organizer_request_id"] = str(organizer_request_id)

        intent = stripe.PaymentIntent.create(
            amount=int(float(amount) * 100),
            currency="usd",
            metadata=meta
        )
        print(f"🔌 Stripe Intent Created: {intent.id}")
        return jsonify({"clientSecret": intent.client_secret, "payment_id": payment.id}), 201
    except Exception as e:
        print(f"❌ Intent Creation Error: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- DATA RETRIEVAL ---

@payments_bp.route("", methods=["GET"])
@jwt_required()
def get_payments():
    user_id = get_jwt_identity()
    payments = Payment.query.join(Event).filter(
        or_(Event.user_id == int(user_id), Event.organizer_id == int(user_id))
    ).all()
    payments_list = []
    for p in payments:
        d = p.to_dict()
        opr = OrganizerPaymentRequest.query.filter_by(payment_id=p.id).first()
        d["payment_type"] = "organizer" if opr else None
        payments_list.append(d)
    return jsonify({"payments": payments_list}), 200

@payments_bp.route("/authorize-verify/<int:payment_id>", methods=["POST"])
@jwt_required()
def verify_payment_manual(payment_id):
    try:
        data = request.get_json()
        pi_id = data.get("payment_intent")
        print(f"🔍 Manual Verification Request for Payment {payment_id} (Intent: {pi_id})")
        
        if not pi_id: return jsonify({"error": "Payment Intent ID required"}), 400
        
        intent = stripe.PaymentIntent.retrieve(pi_id)
        if intent.status == "succeeded":
            success = handle_payment_success(intent)
            if success:
                return jsonify({"status": "verified", "message": "Payment synchronized successfully"}), 200
            else:
                return jsonify({"status": "error", "message": "Database update failed"}), 500
        else:
            print(f"⏳ Intent status still: {intent.status}")
            return jsonify({"status": intent.status, "message": f"Payment status is {intent.status}"}), 200
    except Exception as e:
        print(f"❌ Verification Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@payments_bp.route("/requests", methods=["GET"])
@jwt_required()
def get_payment_requests():
    user_id = get_jwt_identity()
    requests = PaymentRequest.query.join(Event).filter(
        or_(Event.user_id == user_id, Event.organizer_id == user_id)
    ).all()
    return jsonify({"requests": [r.to_dict() for r in requests]}), 200

@payments_bp.route("/events-with-payment-status", methods=["GET"])
@jwt_required()
def get_events_with_payment_status():
    user_id = get_jwt_identity()
    events = Event.query.filter(
        or_(Event.user_id == user_id, Event.organizer_id == user_id)
    ).all()
    results = []
    for event in events:
        cp = Payment.query.filter_by(event_id=event.id, status='completed').all()
        total_p = sum(p.amount for p in cp)
        
        deposit_thresh = event.budget * 0.25
        
        if total_p >= event.budget:
            status = "fully_paid"
        elif total_p > deposit_thresh:
            status = "partially_paid"
        elif total_p >= deposit_thresh:
            status = "deposit_paid"
        else:
            status = "unpaid"

        results.append({
            **event.to_dict(),
            "deposit_amount": deposit_thresh,
            "vendor_payments_total": max(0, total_p - deposit_thresh),
            "payment_status": status
        })
    return jsonify(results), 200

# --- VENDOR REQUESTS ---

@payments_bp.route("/request", methods=["POST"])
@jwt_required()
def request_payment():
    user_id = get_jwt_identity()
    data = request.get_json()
    event_id = data.get("event_id")
    if not event_id:
        return jsonify({"error": "event_id required"}), 400
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    vendor = User.query.get(user_id)
    if not vendor or vendor.role != "vendor":
        return jsonify({"error": "Only vendors can submit payment requests"}), 403
    if event not in vendor.assigned_events:
        return jsonify({"error": "You are not assigned to this event"}), 403
    verification = VendorEventVerification.query.filter_by(event_id=event_id, vendor_id=user_id).first()
    if not verification:
        return jsonify({
            "error": "Complete your work and wait for the organizer to verify before requesting payment."
        }), 403

    existing = PaymentRequest.query.filter_by(
        event_id=event_id,
        vendor_id=user_id
    ).filter(PaymentRequest.status.in_(['pending', 'approved'])).first()
    if existing:
        return jsonify({
            "error": "You have already submitted a payment request for this event. Wait for it to be paid or declined."
        }), 403

    pr = PaymentRequest(event_id=event_id, vendor_id=user_id, amount=float(data['amount']), description=data.get('description', ''), status='pending')
    db.session.add(pr)
    db.session.commit()

    notify_id = event.organizer_id if event.organizer_id is not None else event.user_id
    create_notification(
        notify_id,
        "Payment Request",
        f"Vendor has requested ${data['amount']} for '{event.name}'.",
        "payment",
        {"request_id": pr.id, "event_id": event.id}
    )

    return jsonify({"message": "Request submitted"}), 201

@payments_bp.route("/requests/<int:rid>/approve", methods=["PUT"])
@jwt_required()
def approve_request(rid):
    current_user_id = int(get_jwt_identity())
    pr = PaymentRequest.query.get(rid)
    if not pr:
        return jsonify({"error": "Request not found"}), 404
    if pr.event.user_id != current_user_id and (pr.event.organizer_id is None or pr.event.organizer_id != current_user_id):
        return jsonify({"error": "Unauthorized"}), 403
    pr.status = 'approved'
    db.session.commit()
    
    # Notify Vendor
    create_notification(
        pr.vendor_id,
        "✅ Request Approved",
        f"Your payment request for '{pr.event.name}' was approved.",
        "success",
        {"request_id": pr.id}
    )
    
    return jsonify({"message": "Approved"}), 200

@payments_bp.route("/requests/<int:rid>/reject", methods=["PUT"])
@jwt_required()
def reject_request(rid):
    current_user_id = int(get_jwt_identity())
    pr = PaymentRequest.query.get(rid)
    if not pr:
        return jsonify({"error": "Request not found"}), 404
    if pr.event.user_id != current_user_id and (pr.event.organizer_id is None or pr.event.organizer_id != current_user_id):
        return jsonify({"error": "Unauthorized"}), 403
    pr.status = 'rejected'
    db.session.commit()
    
    # Notify Vendor
    create_notification(
        pr.vendor_id,
        "❌ Request Rejected",
        f"Your payment request for '{pr.event.name}' was rejected.",
        "error",
        {"request_id": pr.id}
    )
    
    return jsonify({"message": "Rejected"}), 200

@payments_bp.route("/requests/<int:rid>/process-payment", methods=["POST"])
@jwt_required()
def process_settlement(rid):
    return jsonify({
        "message": "Use /create-payment-intent with request_id to settle via Stripe",
        "request_id": rid
    }), 200


# --- ORGANIZER PAYMENT REQUESTS (Phase 3) ---

@payments_bp.route("/organizer-request", methods=["POST"])
@jwt_required()
def create_organizer_payment_request():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    event_id = data.get("event_id")
    amount = float(data.get("amount", 0))
    description = data.get("description", "") or "Organizer fee / coordination"
    if not event_id or amount <= 0:
        return jsonify({"error": "event_id and positive amount required"}), 400
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    if event.organizer_id != current_user_id:
        return jsonify({"error": "Only the assigned organizer can request payment for this event"}), 403
    existing_paid = OrganizerPaymentRequest.query.filter_by(
        event_id=event_id, organizer_id=current_user_id, status="paid"
    ).first()
    if existing_paid:
        return jsonify({
            "error": "This event has already been paid by the client. You cannot submit another payment request for it."
        }), 403
    opr = OrganizerPaymentRequest(
        event_id=event_id,
        organizer_id=current_user_id,
        amount=amount,
        description=description,
        status="pending",
    )
    db.session.add(opr)
    db.session.commit()
    create_notification(
        event.user_id,
        "Payment request from organizer",
        f"Organizer has requested {amount:.2f} USD for '{event.name}'.",
        "payment",
        {"organizer_request_id": opr.id, "event_id": event_id},
    )
    return jsonify({"message": "Request submitted", "organizer_request": opr.to_dict()}), 201


@payments_bp.route("/organizer-requests", methods=["GET"])
@jwt_required()
def get_organizer_payment_requests():
    user_id = int(get_jwt_identity())
    # Event owner sees requests for their events; organizer sees their own requests
    requests = OrganizerPaymentRequest.query.join(Event).filter(
        or_(Event.user_id == user_id, OrganizerPaymentRequest.organizer_id == user_id)
    ).all()
    return jsonify({"organizer_requests": [r.to_dict() for r in requests]}), 200


@payments_bp.route("/organizer-requests/<int:oid>/reject", methods=["PUT"])
@jwt_required()
def reject_organizer_request(oid):
    current_user_id = int(get_jwt_identity())
    opr = OrganizerPaymentRequest.query.get(oid)
    if not opr:
        return jsonify({"error": "Request not found"}), 404
    if opr.event.user_id != current_user_id:
        return jsonify({"error": "Only the event owner can reject this request"}), 403
    if opr.status != "pending":
        return jsonify({"error": "Request is not pending"}), 400
    opr.status = "rejected"
    db.session.commit()
    create_notification(
        opr.organizer_id,
        "Payment request declined",
        f"Your payment request for '{opr.event.name}' was declined by the client.",
        "error",
        {"organizer_request_id": opr.id},
    )
    return jsonify({"message": "Rejected"}), 200


@payments_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    user_notifs = [n for n in demo_notifications if int(n['user_id']) == int(user_id)]
    return jsonify({"notifications": user_notifs}), 200

@payments_bp.route("/notifications/<int:nid>/read", methods=["PUT"])
@jwt_required()
def mark_notification_read(nid):
    user_id = get_jwt_identity()
    for n in demo_notifications:
        if int(n['id']) == int(nid) and int(n['user_id']) == int(user_id):
            n['is_read'] = True
            return jsonify({"message": "Marked as read"}), 200
    return jsonify({"error": "Notification not found"}), 404

@payments_bp.route("/notifications/clear-chat", methods=["PUT"])
@jwt_required()
def clear_chat_notifications():
    user_id = get_jwt_identity()
    user_id = int(user_id)
    data = request.get_json()
    sender_id = data.get("sender_id")
    
    if not sender_id:
        return jsonify({"error": "sender_id required"}), 400
        
    count = 0
    for n in demo_notifications:
        # Match user_id as receiver, type 'chat', and extra_data.sender_id matches the param
        if (int(n['user_id']) == user_id and 
            n['type'] == 'chat' and 
            n.get('extra_data') and 
            int(n['extra_data'].get('sender_id')) == int(sender_id)):
            if not n['is_read']:
                n['is_read'] = True
                count += 1
                
    return jsonify({"message": f"Cleared {count} chat notifications"}), 200

@payments_bp.route("/notifications/clear-all", methods=["PUT"])
@jwt_required()
def clear_all_notifications():
    user_id = int(get_jwt_identity())
    count = 0
    for n in demo_notifications:
        if int(n['user_id']) == user_id and not n['is_read']:
            n['is_read'] = True
            count += 1
    return jsonify({"message": f"Cleared {count} notifications"}), 200