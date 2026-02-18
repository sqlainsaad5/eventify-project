from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Event, db, PaymentRequest, Payment
from datetime import datetime
import stripe
from app.config import Config

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")

# Initialize Stripe
stripe.api_key = Config.STRIPE_SECRET_KEY

# Notification storage (Simulated)
demo_notifications = []
notification_counter = 1

def create_notification(user_id, title, message, notification_type="info"):
    global notification_counter
    notification = {
        "id": notification_counter,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "is_read": False,
        "created_at": datetime.now().isoformat()
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
    
    print(f"💰 Processing successful payment context: payment_id={payment_id}, request_id={request_id}")
    
    if payment_id:
        try:
            payment = Payment.query.get(int(payment_id))
            if payment:
                payment.status = "completed"
                # Use getattr for robustness if it's a Stripe object
                payment.transaction_id = getattr(payment_intent, 'id', payment_intent.get('id', 'N/A'))
                payment.payment_date = datetime.now()
                
                # If this was a vendor settlement, mark the request as paid
                if request_id:
                    pr = PaymentRequest.query.get(int(request_id))
                    if pr:
                        pr.status = 'paid'
                        print(f"✅ Vendor settlement (Request {request_id}) marked as PAID")
                
                db.session.commit()
                print(f"✨ Payment {payment_id} marked as COMPLETED in database")
                create_notification(payment.event.user_id, "✅ Payment Verified", f"Funds successfully processed via Stripe.", "success")
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
        user_id = get_jwt_identity()
        data = request.get_json()
        event_id = data.get('event_id')
        amount = data.get('amount')
        request_id = data.get('request_id') # Optional: for vendor settlement

        print(f"🔄 Creating intent for Event {event_id}, Amount {amount}")

        event = Event.query.filter_by(id=event_id, user_id=user_id).first()
        if not event: return jsonify({"error": "Event not found"}), 404

        payment = Payment(
            event_id=event_id, 
            amount=float(amount), 
            currency="USD", 
            status="pending", 
            payment_method="card"
        )
        db.session.add(payment)
        db.session.commit()

        # Build metadata - MUST BE STRINGS OR NUMBERS for Stripe
        meta = {
            "payment_id": str(payment.id), 
            "event_id": str(event_id), 
            "user_id": str(user_id)
        }
        if request_id:
            meta["request_id"] = str(request_id)

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
    payments = Payment.query.join(Event).filter(Event.user_id == int(user_id)).all()
    return jsonify({"payments": [p.to_dict() for p in payments]}), 200

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
    requests = PaymentRequest.query.join(Event).filter(Event.user_id == user_id).all()
    return jsonify({"requests": [r.to_dict() for r in requests]}), 200

@payments_bp.route("/events-with-payment-status", methods=["GET"])
@jwt_required()
def get_events_with_payment_status():
    user_id = get_jwt_identity()
    events = Event.query.filter_by(user_id=user_id).all()
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
    pr = PaymentRequest(event_id=data['event_id'], vendor_id=user_id, amount=float(data['amount']), description=data.get('description',''), status='pending')
    db.session.add(pr)
    db.session.commit()
    return jsonify({"message": "Request submitted"}), 201

@payments_bp.route("/requests/<int:rid>/approve", methods=["PUT"])
@jwt_required()
def approve_request(rid):
    pr = PaymentRequest.query.get(rid)
    pr.status = 'approved'
    db.session.commit()
    return jsonify({"message": "Approved"}), 200

@payments_bp.route("/requests/<int:rid>/reject", methods=["PUT"])
@jwt_required()
def reject_request(rid):
    pr = PaymentRequest.query.get(rid)
    pr.status = 'rejected'
    db.session.commit()
    return jsonify({"message": "Rejected"}), 200

@payments_bp.route("/requests/<int:rid>/process-payment", methods=["POST"])
@jwt_required()
def process_settlement(rid):
    # This now just returns a message to use the checkout flow
    # Frontend should call create-payment-intent with request_id instead
    return jsonify({
        "message": "Use /create-payment-intent with request_id to settle via Stripe",
        "request_id": rid
    }), 200

@payments_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    return jsonify({"notifications": [n for n in demo_notifications if n['user_id'] == user_id]}), 200