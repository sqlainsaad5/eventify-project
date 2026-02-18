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
            "assigned_events": [event.to_dict() for event in self.assigned_events] if self.assigned_events else [],
        }


class Event(db.Model):
    __tablename__ = "event"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    venue = db.Column(db.String(200), nullable=False)
    budget = db.Column(db.Float, nullable=False)
    vendor_category = db.Column(db.String(50), nullable=False)
    image_url = db.Column(db.String(250))
    progress = db.Column(db.Integer, default=0)

    

    # Foreign key linking event to user (organizer)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "date": self.date,
            "venue": self.venue,
            "budget": self.budget,
            "vendor_category": self.vendor_category,
            "image_url": self.image_url,
            "progress": self.progress,
            "user_id": self.user_id,
            "assigned_vendors": [vendor.name for vendor in self.assigned_vendors] if self.assigned_vendors else []
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

class Payment(db.Model):
    __tablename__ = "payment"
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
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
    
    event = db.relationship('Event', backref='payments')
    
    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "payment_method": self.payment_method,
            "transaction_id": self.transaction_id,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "event_name": self.event.name if self.event else "Unknown Event",
            "bank_reference": self.bank_reference,  # ✅ UNCOMMENT
            "transfer_date": self.transfer_date.isoformat() if self.transfer_date else None  # ✅ UNCOMMENT
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