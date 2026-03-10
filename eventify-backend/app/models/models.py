from app.extensions import db
from passlib.hash import bcrypt
from datetime import datetime 


# Association table for vendor-event assignments
vendor_events = db.Table('vendor_events',
    db.Column('vendor_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('event_id', db.Integer, db.ForeignKey('event.id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=db.func.current_timestamp())
)

vendor_completed_events = db.Table('vendor_completed_events',
    db.Column('vendor_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('event_id', db.Integer, db.ForeignKey('event.id'), primary_key=True),
    db.Column('completed_at', db.DateTime, default=db.func.current_timestamp())
)

from itsdangerous import URLSafeTimedSerializer
from flask import current_app

class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255))
    role = db.Column(db.String(50))
    city = db.Column(db.String(100))
    phone = db.Column(db.String(50))
    category = db.Column(db.String(100))
    profile_image = db.Column(db.Text)
    is_verified = db.Column(db.Boolean, default=False)  # ✅ NEW
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    assigned_events = db.relationship(
        'Event',
        secondary='vendor_events',
        backref=db.backref('assigned_vendors', lazy='dynamic')
    )

    completed_events = db.relationship(
        'Event',
        secondary='vendor_completed_events',
        backref=db.backref('completed_by_vendors', lazy='dynamic')
    )

    def set_password(self, password):
        self.password_hash = bcrypt.hash(password)

    def check_password(self, password):
        try:
            return bcrypt.verify(password, self.password_hash)
        except ValueError:
            return False

    # ✅ Generate token
    def generate_verification_token(self):
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        return s.dumps(self.email, salt='email-confirm-salt')

    # ✅ Verify token
    @staticmethod
    def verify_token(token, expiration=3600):
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        try:
            email = s.loads(token, salt='email-confirm-salt', max_age=expiration)
        except Exception:
            return None
        return email

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "city": self.city,
            "phone": self.phone,
            "category": self.category,
            "profile_image": self.profile_image,
            "is_verified": self.is_verified,  # ✅ include in API responses
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "assigned_events": [event.to_dict() for event in self.assigned_events] if self.assigned_events else [],
        }


class Event(db.Model):
    __tablename__ = "event"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    venue = db.Column(db.String(200), nullable=False)
    budget = db.Column(db.Float, nullable=False)
    total_spent = db.Column(db.Float, default=0.0)
    remaining_budget = db.Column(db.Float, nullable=True)
    vendor_category = db.Column(db.String(50), nullable=False)
    image_url = db.Column(db.String(250))
    progress = db.Column(db.Integer, default=0)

    # High-level lifecycle status for the event
    # created, awaiting_organizer_confirmation, pending_advance_payment,
    # advance_payment_completed, vendor_assigned, completed
    status = db.Column(db.String(50), default="created")

    # Organizer payment workflow flags
    # Track 25% advance, 75% request, and 75% completion for organizer fees
    organizer_advance_paid = db.Column(db.Boolean, default=False)
    organizer_final_requested = db.Column(db.Boolean, default=False)
    organizer_final_paid = db.Column(db.Boolean, default=False)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    organizer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    organizer_status = db.Column(db.String(20), default="pending") # pending, accepted, rejected

    # Relationships
    creator = db.relationship('User', foreign_keys=[user_id], backref='events_created')
    organizer = db.relationship('User', foreign_keys=[organizer_id], backref='events_organized')

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "date": self.date,
            "venue": self.venue,
            "budget": self.budget,
            "total_budget": self.budget,
            "total_spent": self.total_spent or 0,
            "remaining_budget": self.remaining_budget if self.remaining_budget is not None else (self.budget - (self.total_spent or 0)),
            "vendor_category": self.vendor_category,
            "image_url": self.image_url,
            "progress": self.progress,
            "status": self.status,
            "organizer_advance_paid": bool(self.organizer_advance_paid),
            "organizer_final_requested": bool(self.organizer_final_requested),
            "organizer_final_paid": bool(self.organizer_final_paid),
            "user_id": self.user_id,
            "organizer_id": self.organizer_id,
            "organizer_name": self.organizer.name if self.organizer else None,
            "organizer_status": self.organizer_status,
            "assigned_vendors": [vendor.name for vendor in self.assigned_vendors] if self.assigned_vendors else []
        }


class EventApplication(db.Model):
    """Organizer applications for open events (freelance-style flow)."""
    __tablename__ = "event_application"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    organizer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="pending")  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    __table_args__ = (db.UniqueConstraint("event_id", "organizer_id", name="uq_event_application_event_organizer"),)

    event = db.relationship("Event", backref=db.backref("applications", lazy="dynamic"))
    organizer = db.relationship("User", backref=db.backref("event_applications", lazy="dynamic"))

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "organizer_id": self.organizer_id,
            "organizer_name": self.organizer.name if self.organizer else None,
            "organizer_email": self.organizer.email if self.organizer else None,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


 # Add this to your existing models.py

class PaymentRequest(db.Model):
    __tablename__ = "payment_request"
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, paid
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    event = db.relationship('Event', backref='payment_requests')
    vendor = db.relationship('User', backref='payment_requests')
    
    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "vendor_id": self.vendor_id,
            "vendor_name": self.vendor.name if self.vendor else "Unknown Vendor",
            "amount": self.amount,
            "status": self.status,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "event_name": self.event.name if self.event else "Unknown Event"
        }


class EventVendorAgreement(db.Model):
    """Agreed price and payment status per event-vendor (Budget Planner FR-04)."""
    __tablename__ = "event_vendor_agreement"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    agreed_price = db.Column(db.Float, nullable=False)
    service_type = db.Column(db.String(100), default="General")
    payment_status = db.Column(db.String(20), default="pending")  # pending, advance_paid, completed
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    event = db.relationship("Event", backref="vendor_agreements")
    vendor = db.relationship("User", backref="event_agreements")

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "vendor_id": self.vendor_id,
            "vendor_name": self.vendor.name if self.vendor else "Unknown Vendor",
            "agreed_price": self.agreed_price,
            "service_type": self.service_type,
            "payment_status": self.payment_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Payment(db.Model):
    __tablename__ = "payment"
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    payment_type = db.Column(db.String(20), nullable=True)  # advance, final, or null for non-vendor
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    status = db.Column(db.String(30), default='pending')  # Increased length
    payment_method = db.Column(db.String(50), default='card')
    transaction_id = db.Column(db.String(100))
    payment_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # ✅ UNCOMMENT THESE - Now columns exist in database
    bank_reference = db.Column(db.String(100))
    transfer_date = db.Column(db.DateTime)
    notes = db.Column(db.Text, nullable=True)

    event = db.relationship('Event', backref='payments')
    vendor = db.relationship('User', foreign_keys=[vendor_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "vendor_id": self.vendor_id,
            "vendor_name": self.vendor.name if self.vendor else None,
            "payment_type": self.payment_type,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "payment_method": self.payment_method,
            "transaction_id": self.transaction_id,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "event_name": self.event.name if self.event else "Unknown Event",
            "bank_reference": self.bank_reference,
            "transfer_date": self.transfer_date.isoformat() if self.transfer_date else None,
            "notes": self.notes,
        }

# Add this to your existing models.py

class ChatMessage(db.Model):
    __tablename__ = "chat_message"
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')
    event = db.relationship('Event', backref='chat_messages')
    
    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.name if self.sender else "Unknown",
            "receiver_id": self.receiver_id,
            "receiver_name": self.receiver.name if self.receiver else "Unknown",
            "event_id": self.event_id,
            "event_name": self.event.name if self.event else "Unknown Event",
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "timestamp": self.created_at.strftime("%I:%M %p") if self.created_at else None
        }


class OrganizerPaymentRequest(db.Model):
    """Organizer requests payment from event owner (Phase 3 professional flow)."""
    __tablename__ = "organizer_payment_request"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    organizer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="USD")
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default="pending")  # pending, paid, rejected
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    paid_at = db.Column(db.DateTime)
    payment_id = db.Column(db.Integer, db.ForeignKey("payment.id"), nullable=True)

    event = db.relationship("Event", backref="organizer_payment_requests")
    organizer = db.relationship("User", foreign_keys=[organizer_id])

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "event_name": self.event.name if self.event else None,
            "organizer_id": self.organizer_id,
            "organizer_name": self.organizer.name if self.organizer else None,
            "amount": self.amount,
            "currency": self.currency,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }


class VendorEventVerification(db.Model):
    """Organizer verification of vendor work for an event (Phase 1 professional flow)."""
    __tablename__ = "vendor_event_verification"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    verified_by_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    verified_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    event = db.relationship("Event", backref="vendor_verifications")
    vendor = db.relationship("User", foreign_keys=[vendor_id])
    verified_by = db.relationship("User", foreign_keys=[verified_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "vendor_id": self.vendor_id,
            "verified_by_id": self.verified_by_id,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
        }


# ✅ SERVICE MODELS - ADD THESE AT THE END
class ServicePackage(db.Model):
    __tablename__ = "service_package"
    
    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=False)
    package_name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False)
    duration = db.Column(db.String(100))
    features = db.Column(db.Text)
    
    def to_dict(self):
        return {
            "packageName": self.package_name,
            "price": self.price,
            "duration": self.duration,
            "features": eval(self.features) if self.features else []
        }

class Service(db.Model):
    __tablename__ = "service"
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    event_type = db.Column(db.String(100), nullable=False)
    base_price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    location = db.Column(db.String(200))
    availability = db.Column(db.Text)
    portfolio_images = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())  # ✅ CHANGE THIS LINE
    
    packages = db.relationship('ServicePackage', backref='service', lazy=True, cascade='all, delete-orphan')
    vendor = db.relationship('User', backref='services')
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "eventType": self.event_type,
            "basePrice": self.base_price,
            "description": self.description,
            "location": self.location,
            "availability": eval(self.availability) if self.availability else [],
            "portfolioImages": eval(self.portfolio_images) if self.portfolio_images else [],
            "isActive": self.is_active,
            "packages": [pkg.to_dict() for pkg in self.packages],
            "vendor_id": self.vendor_id
        }