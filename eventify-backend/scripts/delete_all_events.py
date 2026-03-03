"""
One-off script: delete all events and all records that reference them.
Run from eventify-backend: python scripts/delete_all_events.py
"""
import sys
import os

# Run from backend root so app can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models.models import (
    Event,
    Payment,
    OrganizerPaymentRequest,
    PaymentRequest,
    VendorEventVerification,
    EventVendorAgreement,
    ChatMessage,
    vendor_events,
    vendor_completed_events,
)

app = create_app()

with app.app_context():
    event_ids = [e.id for e in Event.query.all()]
    if not event_ids:
        print("No events in the database.")
        sys.exit(0)

    print(f"Found {len(event_ids)} event(s). Deleting related records then events...")

    # Delete in order of foreign key dependencies
    ChatMessage.query.filter(ChatMessage.event_id.in_(event_ids)).delete(synchronize_session=False)
    VendorEventVerification.query.filter(VendorEventVerification.event_id.in_(event_ids)).delete(synchronize_session=False)
    OrganizerPaymentRequest.query.filter(OrganizerPaymentRequest.event_id.in_(event_ids)).delete(synchronize_session=False)
    PaymentRequest.query.filter(PaymentRequest.event_id.in_(event_ids)).delete(synchronize_session=False)
    EventVendorAgreement.query.filter(EventVendorAgreement.event_id.in_(event_ids)).delete(synchronize_session=False)
    Payment.query.filter(Payment.event_id.in_(event_ids)).delete(synchronize_session=False)

    # Association tables (many-to-many)
    db.session.execute(vendor_events.delete().where(vendor_events.c.event_id.in_(event_ids)))
    db.session.execute(vendor_completed_events.delete().where(vendor_completed_events.c.event_id.in_(event_ids)))

    # Finally delete events
    Event.query.filter(Event.id.in_(event_ids)).delete(synchronize_session=False)

    db.session.commit()
    print("All events and their related records have been deleted.")
