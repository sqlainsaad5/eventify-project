import json
import os
import uuid
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models import Complaint, Event, User
from app.models.models import get_vendor_event_partnership_status

complaints_bp = Blueprint("complaints", __name__, url_prefix="/api")

COMPLAINT_TYPES = frozenset({
    "user_to_organizer",
    "organizer_to_user",
    "organizer_to_vendor",
    "vendor_to_organizer",
})
BLOCKED_COMPLAINT_TYPES = frozenset({"user_to_vendor", "vendor_to_user"})
CATEGORIES = frozenset({"conduct", "service_quality", "payment", "harassment", "other"})
MAX_DESCRIPTION_LEN = 2000
MIN_DESCRIPTION_LEN = 20
MAX_FILES = 3
MAX_FILE_BYTES = 5 * 1024 * 1024
ALLOWED_MIMES = frozenset({
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
})
OPEN_STATUSES = frozenset({"open", "under_review"})
MAX_OPEN_COMPLAINTS_PER_USER = 5


def _uid():
    return int(get_jwt_identity())


def _vendor_accepted_on_event(event_id: int, vendor_id: int) -> bool:
    return get_vendor_event_partnership_status(vendor_id, event_id) == "accepted"


def _validate_complaint_pair(complaint_type: str, author: User, event: Event, subject: User) -> str | None:
    """Return error message if invalid, else None."""
    if complaint_type in BLOCKED_COMPLAINT_TYPES:
        return "This complaint type is not allowed"

    if complaint_type == "user_to_organizer":
        if author.role != "user":
            return "Only event hosts can file this complaint"
        if event.user_id != author.id:
            return "You can only complain about organizers for your own events"
        if not event.organizer_id:
            return "No organizer assigned to this event"
        if subject.id != event.organizer_id:
            return "Subject must be the assigned organizer for this event"
        return None

    if complaint_type == "organizer_to_user":
        if author.role != "organizer":
            return "Only organizers can file this complaint"
        if event.organizer_id != author.id:
            return "You can only complain for events you organize"
        if subject.id != event.user_id:
            return "Subject must be the event host"
        return None

    if complaint_type == "organizer_to_vendor":
        if author.role != "organizer":
            return "Only organizers can file this complaint"
        if event.organizer_id != author.id:
            return "You can only complain for events you organize"
        if subject.role != "vendor":
            return "Subject must be a vendor"
        if not _vendor_accepted_on_event(event.id, subject.id):
            return "Vendor must have accepted partnership on this event"
        return None

    if complaint_type == "vendor_to_organizer":
        if author.role != "vendor":
            return "Only vendors can file this complaint"
        if not _vendor_accepted_on_event(event.id, author.id):
            return "You must have accepted partnership on this event"
        if not event.organizer_id:
            return "No organizer assigned to this event"
        if subject.id != event.organizer_id:
            return "Subject must be the assigned organizer for this event"
        return None

    return "Invalid complaint_type"


def _save_complaint_files(files) -> list[str]:
    upload_root = current_app.config["UPLOAD_FOLDER"]
    complaints_dir = os.path.join(upload_root, "complaints")
    os.makedirs(complaints_dir, exist_ok=True)

    saved_urls = []
    for f in files[:MAX_FILES]:
        if not f or not f.filename:
            continue
        mime = (f.mimetype or "").split(";")[0].strip().lower()
        if mime not in ALLOWED_MIMES:
            raise ValueError(f"File type not allowed: {mime or 'unknown'}")
        f.seek(0, os.SEEK_END)
        size = f.tell()
        f.seek(0)
        if size > MAX_FILE_BYTES:
            raise ValueError("Each file must be at most 5MB")
        filename = secure_filename(f.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(complaints_dir, unique_filename)
        f.save(filepath)
        saved_urls.append(f"/uploads/complaints/{unique_filename}")
    return saved_urls


@complaints_bp.route("/events/<int:event_id>/complaints", methods=["POST"])
@jwt_required()
def create_event_complaint(event_id):
    author_id = _uid()
    author = User.query.get(author_id)
    if not author:
        return jsonify({"error": "User not found"}), 404
    if not getattr(author, "is_active", True):
        return jsonify({"error": "Account is disabled. Contact support."}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    complaint_type = (request.form.get("complaint_type") or "").strip()
    category = (request.form.get("category") or "").strip()
    description = (request.form.get("description") or "").strip()
    subject_raw = request.form.get("subject_id")

    if complaint_type not in COMPLAINT_TYPES:
        if complaint_type in BLOCKED_COMPLAINT_TYPES:
            return jsonify({"error": "This complaint type is not allowed"}), 403
        return jsonify({"error": "Invalid complaint_type"}), 400
    if category not in CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    if len(description) < MIN_DESCRIPTION_LEN:
        return jsonify({"error": f"Description must be at least {MIN_DESCRIPTION_LEN} characters"}), 400
    if len(description) > MAX_DESCRIPTION_LEN:
        return jsonify({"error": f"Description must be at most {MAX_DESCRIPTION_LEN} characters"}), 400

    try:
        subject_id = int(subject_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "subject_id is required"}), 400

    subject = User.query.get(subject_id)
    if not subject:
        return jsonify({"error": "Subject user not found"}), 404

    pair_err = _validate_complaint_pair(complaint_type, author, event, subject)
    if pair_err:
        return jsonify({"error": pair_err}), 403

    open_count = Complaint.query.filter(
        Complaint.complainant_id == author_id,
        Complaint.status.in_(OPEN_STATUSES),
    ).count()
    if open_count >= MAX_OPEN_COMPLAINTS_PER_USER:
        return jsonify({"error": "You have too many open complaints. Wait for admin review."}), 429

    duplicate = Complaint.query.filter(
        Complaint.event_id == event_id,
        Complaint.complainant_id == author_id,
        Complaint.subject_id == subject_id,
        Complaint.complaint_type == complaint_type,
        Complaint.status.in_(OPEN_STATUSES),
    ).first()
    if duplicate:
        return jsonify({"error": "You already have an open complaint for this person on this event"}), 409

    files = request.files.getlist("files")
    if not files or all(not f or not f.filename for f in files):
        return jsonify({"error": "At least one proof file (image or PDF) is required"}), 400

    try:
        attachment_urls = _save_complaint_files(files)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if not attachment_urls:
        return jsonify({"error": "At least one proof file (image or PDF) is required"}), 400

    complaint = Complaint(
        event_id=event.id,
        complainant_id=author_id,
        subject_id=subject_id,
        complaint_type=complaint_type,
        category=category,
        description=description,
        attachment_urls=json.dumps(attachment_urls),
        status="open",
    )
    db.session.add(complaint)
    db.session.commit()

    return jsonify({
        "message": "Complaint submitted",
        "complaint": complaint.to_dict(),
    }), 201


@complaints_bp.route("/complaints/mine", methods=["GET"])
@jwt_required()
def list_my_complaints():
    author_id = _uid()
    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(50, max(1, request.args.get("per_page", type=int) or 20))

    query = Complaint.query.filter_by(complainant_id=author_id)
    total = query.count()
    rows = (
        query.order_by(Complaint.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return jsonify({
        "complaints": [c.to_dict() for c in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200
