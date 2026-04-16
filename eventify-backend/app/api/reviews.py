from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Event, User, Review, Payment, vendor_completed_events

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api")

REVIEW_TYPES = frozenset({"user_to_organizer", "organizer_to_vendor"})
MAX_COMMENT_LEN = 2000


def _uid():
    return int(get_jwt_identity())


def _rating_summary_for_user(user_id: int):
    """Aggregates where this user is the review subject."""
    q_org = (
        db.session.query(func.avg(Review.rating), func.count(Review.id))
        .filter(
            Review.subject_id == user_id,
            Review.review_type == "user_to_organizer",
            Review.status == "published",
        )
        .one()
    )
    q_vendor = (
        db.session.query(func.avg(Review.rating), func.count(Review.id))
        .filter(
            Review.subject_id == user_id,
            Review.review_type == "organizer_to_vendor",
            Review.status == "published",
        )
        .one()
    )
    avg_o, cnt_o = q_org[0], q_org[1]
    avg_v, cnt_v = q_vendor[0], q_vendor[1]
    return {
        "organizer": {
            "avg": round(float(avg_o), 2) if avg_o is not None else None,
            "count": int(cnt_o or 0),
        },
        "vendor": {
            "avg": round(float(avg_v), 2) if avg_v is not None else None,
            "count": int(cnt_v or 0),
        },
    }


def _vendor_completed_for_event(event_id: int, vendor_id: int) -> bool:
    row = (
        db.session.query(vendor_completed_events)
        .filter(
            vendor_completed_events.c.event_id == event_id,
            vendor_completed_events.c.vendor_id == vendor_id,
        )
        .first()
    )
    return row is not None


def _vendor_final_payment_completed_for_event(event_id: int, vendor_id: int) -> bool:
    """Budget planner final (25/75) or Stripe vendor payout request settlement."""
    return (
        Payment.query.filter(
            Payment.event_id == event_id,
            Payment.vendor_id == vendor_id,
            Payment.status == "completed",
            or_(
                Payment.payment_type == "final",
                Payment.payment_type == "vendor_settlement",
            ),
        ).first()
        is not None
    )


@reviews_bp.route("/events/<int:event_id>/reviews", methods=["POST"])
@jwt_required()
def create_event_review(event_id):
    author_id = _uid()
    author = User.query.get(author_id)
    if not author:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    review_type = data.get("review_type")
    subject_id = data.get("subject_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip() or None

    if review_type not in REVIEW_TYPES:
        return jsonify({"error": "Invalid review_type"}), 400
    try:
        subject_id = int(subject_id)
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "subject_id and rating are required"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "rating must be 1–5"}), 400
    if comment and len(comment) > MAX_COMMENT_LEN:
        return jsonify({"error": f"comment must be at most {MAX_COMMENT_LEN} characters"}), 400

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    subject = User.query.get(subject_id)
    if not subject:
        return jsonify({"error": "Subject user not found"}), 404

    if review_type == "user_to_organizer":
        if author.role != "user":
            return jsonify({"error": "Only event owners (users) can submit this review"}), 403
        if event.user_id != author_id:
            return jsonify({"error": "You can only review organizers for your own events"}), 403
        if event.organizer_id != subject_id:
            return jsonify({"error": "subject_id must be the assigned organizer for this event"}), 403
        if event.organizer_status != "accepted":
            return jsonify({"error": "Organizer must have accepted before you can review"}), 403
        if event.status != "completed":
            return jsonify({"error": "Event must be completed before you can review the organizer"}), 403

    elif review_type == "organizer_to_vendor":
        if author.role != "organizer":
            return jsonify({"error": "Only organizers can submit this review"}), 403
        if event.organizer_id != author_id:
            return jsonify({"error": "You can only review vendors for events you organize"}), 403
        if subject.role != "vendor":
            return jsonify({"error": "Review subject must be a vendor"}), 400
        if not (
            _vendor_completed_for_event(event.id, subject_id)
            or _vendor_final_payment_completed_for_event(event.id, subject_id)
        ):
            return jsonify(
                {
                    "error": "You can only review vendors after final payment is registered or they mark the event complete"
                }
            ), 403

    review = Review(
        event_id=event.id,
        author_id=author_id,
        subject_id=subject_id,
        review_type=review_type,
        rating=rating,
        comment=comment,
        status="published",
    )
    db.session.add(review)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "You have already submitted this type of review for this event"}), 409
    except Exception:
        db.session.rollback()
        raise

    return jsonify({"message": "Review created", "review": review.to_dict()}), 201


@reviews_bp.route("/events/<int:event_id>/review-status", methods=["GET"])
@jwt_required()
def event_review_status(event_id):
    """What the current user has already submitted for this event (for UI)."""
    author_id = _uid()
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    user_row = User.query.get(author_id)
    if not user_row:
        return jsonify({"error": "User not found"}), 404

    out = {
        "event_id": event_id,
        "my_user_to_organizer": None,
        "my_organizer_to_vendor": {},
        "can_review_organizer": False,
        "can_review_vendor_ids": [],
    }

    if user_row.role == "user" and event.user_id == author_id:
        out["can_review_organizer"] = (
            event.organizer_id is not None
            and event.organizer_status == "accepted"
            and event.status == "completed"
        )
        r = Review.query.filter_by(
            event_id=event_id, author_id=author_id, review_type="user_to_organizer"
        ).first()
        if r:
            out["my_user_to_organizer"] = r.to_dict()

    if user_row.role == "organizer" and event.organizer_id == author_id:
        completed_ids = [v.id for v in event.completed_by_vendors.all()]
        out["can_review_vendor_ids"] = completed_ids
        vendor_reviews = Review.query.filter_by(
            event_id=event_id, author_id=author_id, review_type="organizer_to_vendor"
        ).all()
        for vr in vendor_reviews:
            out["my_organizer_to_vendor"][str(vr.subject_id)] = vr.to_dict()

    return jsonify(out), 200


@reviews_bp.route("/users/<int:user_id>/reviews", methods=["GET"])
@jwt_required()
def list_user_reviews(user_id):
    review_type = request.args.get("review_type")
    page = request.args.get("page", 1, type=int) or 1
    per_page = min(request.args.get("per_page", 20, type=int) or 20, 100)
    if page < 1:
        page = 1

    q = Review.query.filter(Review.subject_id == user_id, Review.status == "published")
    if review_type:
        if review_type not in REVIEW_TYPES:
            return jsonify({"error": "Invalid review_type"}), 400
        q = q.filter(Review.review_type == review_type)

    q = q.order_by(Review.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify(
        {
            "reviews": [r.to_dict() for r in items],
            "total": total,
            "page": page,
            "per_page": per_page,
        }
    ), 200


@reviews_bp.route("/users/<int:user_id>/rating-summary", methods=["GET"])
@jwt_required()
def user_rating_summary(user_id):
    if not User.query.get(user_id):
        return jsonify({"error": "User not found"}), 404
    return jsonify(_rating_summary_for_user(user_id)), 200


@reviews_bp.route("/users/rating-summaries", methods=["POST"])
@jwt_required()
def batch_rating_summaries():
    data = request.get_json() or {}
    ids = data.get("user_ids")
    if not isinstance(ids, list):
        return jsonify({"error": "user_ids must be a list"}), 400
    try:
        int_ids = [int(x) for x in ids[:100]]
    except (TypeError, ValueError):
        return jsonify({"error": "user_ids must be integers"}), 400

    summaries = {str(uid): _rating_summary_for_user(uid) for uid in int_ids}
    return jsonify({"summaries": summaries}), 200
