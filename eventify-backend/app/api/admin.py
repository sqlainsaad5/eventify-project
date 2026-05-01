from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    User,
    Event,
    Payment,
    PaymentRequest,
    OrganizerPaymentRequest,
    Review,
    ChatMessage,
    EventVendorAgreement,
    BudgetPlanItem,
)
from app.models.models import vendor_events
from app.extensions import db
from sqlalchemy import or_, func
from datetime import datetime, timedelta
import csv
import io


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def require_admin():
    """Ensure the current JWT identity is an admin user."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        return None, (jsonify({"error": "Admin access required"}), 403)
    if not getattr(user, "is_active", True):
        return None, (jsonify({"error": "Admin account is disabled"}), 403)
    return user, None


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@admin_bp.route("/overview", methods=["GET"])
@jwt_required()
def admin_overview():
    """High-level platform stats for the admin dashboard."""
    _, err = require_admin()
    if err:
        return err

    total_users = User.query.count()
    total_organizers = User.query.filter_by(role="organizer").count()
    total_vendors = User.query.filter_by(role="vendor").count()
    total_clients = User.query.filter_by(role="user").count()

    total_events = Event.query.count()
    pending_events = Event.query.filter_by(organizer_status="pending").count()
    total_budget = db.session.query(db.func.coalesce(db.func.sum(Event.budget), 0)).scalar() or 0

    total_payments = Payment.query.count()
    total_revenue = db.session.query(db.func.coalesce(db.func.sum(Payment.amount), 0)).scalar() or 0
    pending_vendor_requests = PaymentRequest.query.filter_by(status="pending").count()

    opr_pending = OrganizerPaymentRequest.query.filter_by(status="pending").count()
    opr_paid = OrganizerPaymentRequest.query.filter_by(status="paid").count()
    opr_rejected = OrganizerPaymentRequest.query.filter_by(status="rejected").count()
    vendor_settlement_count = Payment.query.filter(Payment.vendor_id.isnot(None)).count()
    platform_or_host_count = Payment.query.filter(Payment.vendor_id.is_(None)).count()

    return jsonify(
        {
            "users": {
                "total": total_users,
                "organizers": total_organizers,
                "vendors": total_vendors,
                "clients": total_clients,
            },
            "events": {
                "total": total_events,
                "pending_organizer": pending_events,
                "total_budget": float(total_budget),
            },
            "payments": {
                "total": total_payments,
                "total_revenue": float(total_revenue),
                "pending_requests": pending_vendor_requests,
                "pending_organizer_requests": opr_pending,
                "organizer_requests_paid": opr_paid,
                "organizer_requests_rejected": opr_rejected,
                "by_lane": {
                    "vendor_settlement": vendor_settlement_count,
                    "platform_or_host": platform_or_host_count,
                },
            },
        }
    ), 200


# ---------------------------------------------------------------------------
# Users: list (paginated, search, filter), PATCH, bulk status, export
# ---------------------------------------------------------------------------

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def admin_users():
    """List users with pagination, search (name/email), and filters (role, is_active)."""
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    q = (request.args.get("q") or "").strip()
    role = request.args.get("role")
    is_active = request.args.get("is_active")

    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))
    if role:
        query = query.filter_by(role=role)
    if is_active is not None:
        if is_active.lower() in ("true", "1", "yes"):
            query = query.filter(User.is_active == True)
        elif is_active.lower() in ("false", "0", "no"):
            query = query.filter(User.is_active == False)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "users": [u.to_dict() for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/users/<int:user_id>/summary", methods=["GET"])
@jwt_required()
def admin_user_summary(user_id):
    """Aggregated profile, counts, and recent financial activity for a user."""
    _, err = require_admin()
    if err:
        return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    events_created = Event.query.filter_by(user_id=user_id).count()
    events_organized = Event.query.filter_by(organizer_id=user_id).count()
    vendor_event_links = (
        db.session.query(func.count(vendor_events.c.event_id))
        .filter(vendor_events.c.vendor_id == user_id)
        .scalar()
        or 0
    )

    pay_q = (
        Payment.query.join(Event, Payment.event_id == Event.id)
        .filter(
            or_(
                Event.user_id == user_id,
                Event.organizer_id == user_id,
                Payment.vendor_id == user_id,
            )
        )
        .order_by(Payment.created_at.desc())
        .limit(15)
    )
    recent_payments = [_payment_admin_dict(p) for p in pay_q.all()]

    opr_recent = (
        OrganizerPaymentRequest.query.filter_by(organizer_id=user_id)
        .order_by(OrganizerPaymentRequest.created_at.desc())
        .limit(10)
        .all()
    )
    vpr_recent = (
        PaymentRequest.query.filter_by(vendor_id=user_id)
        .order_by(PaymentRequest.created_at.desc())
        .limit(10)
        .all()
    )

    return jsonify(
        {
            "user": user.to_dict(),
            "counts": {
                "events_created": events_created,
                "events_organized": events_organized,
                "vendor_event_links": int(vendor_event_links),
            },
            "recent_payments": recent_payments,
            "recent_organizer_payment_requests": [_organizer_payment_request_admin_dict(r) for r in opr_recent],
            "recent_vendor_payment_requests": [r.to_dict() for r in vpr_recent],
        }
    ), 200


@admin_bp.route("/users/<int:user_id>", methods=["PATCH"])
@jwt_required()
def admin_patch_user(user_id):
    """Update user: name, email, role, city, phone, category, is_active."""
    _, err = require_admin()
    if err:
        return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    if "name" in data and data["name"] is not None:
        user.name = data["name"]
    if "email" in data and data["email"] is not None:
        user.email = data["email"].strip().lower()
    if "role" in data and data["role"] is not None:
        user.role = data["role"]
    if "city" in data:
        user.city = data["city"]
    if "phone" in data:
        user.phone = data["phone"]
    if "category" in data:
        user.category = data["category"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify(user.to_dict()), 200


@admin_bp.route("/users/bulk-status", methods=["POST"])
@jwt_required()
def admin_bulk_user_status():
    """Bulk set is_active for multiple users. Body: { "user_ids": [1,2,...], "is_active": true }"""
    _, err = require_admin()
    if err:
        return err

    data = request.get_json() or {}
    user_ids = data.get("user_ids") or []
    is_active = data.get("is_active")
    if not user_ids or is_active is None:
        return jsonify({"error": "user_ids and is_active are required"}), 400

    updated = User.query.filter(User.id.in_(user_ids)).update(
        {User.is_active: bool(is_active)}, synchronize_session="fetch"
    )
    db.session.commit()
    return jsonify({"updated": updated}), 200


@admin_bp.route("/users/export", methods=["GET"])
@jwt_required()
def admin_users_export():
    """Export users as CSV with same filters as list (q, role, is_active)."""
    _, err = require_admin()
    if err:
        return err

    q = (request.args.get("q") or "").strip()
    role = request.args.get("role")
    is_active = request.args.get("is_active")
    format_type = (request.args.get("format") or "csv").lower()

    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))
    if role:
        query = query.filter_by(role=role)
    if is_active is not None:
        if is_active.lower() in ("true", "1", "yes"):
            query = query.filter(User.is_active == True)
        elif is_active.lower() in ("false", "0", "no"):
            query = query.filter(User.is_active == False)

    users = query.order_by(User.created_at.desc()).all()

    if format_type != "csv":
        return jsonify({"error": "Only format=csv is supported"}), 400

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "name", "email", "role", "city", "phone", "category", "is_verified", "is_active", "created_at"])
    for u in users:
        writer.writerow([
            u.id,
            u.name or "",
            u.email or "",
            u.role or "",
            u.city or "",
            u.phone or "",
            u.category or "",
            u.is_verified,
            getattr(u, "is_active", True),
            u.created_at.isoformat() if u.created_at else "",
        ])
    buffer.seek(0)
    headers = {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=users_export.csv",
    }
    return Response(buffer.getvalue(), headers=headers, mimetype="text/csv")


# ---------------------------------------------------------------------------
# Events: list (paginated, search, filter), PATCH (organizer_status)
# ---------------------------------------------------------------------------

@admin_bp.route("/events", methods=["GET"])
@jwt_required()
def admin_events():
    """List events with pagination, search (name/venue), filter by organizer_status."""
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    q = (request.args.get("q") or "").strip()
    organizer_status = request.args.get("organizer_status")

    organizer_id = request.args.get("organizer_id", type=int)
    query = Event.query
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Event.name.ilike(like), Event.venue.ilike(like)))
    if organizer_status:
        query = query.filter_by(organizer_status=organizer_status)
    if organizer_id is not None:
        query = query.filter_by(organizer_id=organizer_id)

    total = query.count()
    events = query.order_by(Event.date.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "events": [e.to_dict() for e in events],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/events/<int:event_id>", methods=["PATCH"])
@jwt_required()
def admin_patch_event(event_id):
    """Update event: organizer_status (accepted/rejected)."""
    _, err = require_admin()
    if err:
        return err

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    data = request.get_json() or {}
    if "organizer_status" in data:
        val = data["organizer_status"]
        if val in ("pending", "accepted", "rejected"):
            event.organizer_status = val

    db.session.commit()
    return jsonify(event.to_dict()), 200


# ---------------------------------------------------------------------------
# Payments: list (paginated, filter)
# ---------------------------------------------------------------------------


def _payment_admin_dict(p: Payment) -> dict:
    """Payment row plus event host/organizer and settlement lane for admin UI."""
    d = p.to_dict()
    ev = p.event
    if ev:
        host = ev.creator
        org = ev.organizer
        d["host_id"] = ev.user_id
        d["host_name"] = host.name if host else None
        d["organizer_id"] = ev.organizer_id
        d["organizer_name"] = org.name if org else None
    else:
        d["host_id"] = None
        d["host_name"] = None
        d["organizer_id"] = None
        d["organizer_name"] = None
    d["lane"] = "vendor_settlement" if p.vendor_id is not None else "platform_or_host"
    return d


@admin_bp.route("/payments", methods=["GET"])
@jwt_required()
def admin_payments():
    """List payments with pagination; filter by status, event_id, vendor_id, lane."""
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    status = request.args.get("status")
    event_id = request.args.get("event_id", type=int)
    vendor_id = request.args.get("vendor_id", type=int)
    lane = (request.args.get("lane") or "").strip().lower()

    query = Payment.query
    if status:
        query = query.filter_by(status=status)
    if event_id is not None:
        query = query.filter_by(event_id=event_id)
    if vendor_id is not None:
        query = query.filter_by(vendor_id=vendor_id)
    if lane == "vendor_settlement":
        query = query.filter(Payment.vendor_id.isnot(None))
    elif lane == "platform_or_host":
        query = query.filter(Payment.vendor_id.is_(None))

    total = query.count()
    payments = query.order_by(Payment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "payments": [_payment_admin_dict(p) for p in payments],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


# ---------------------------------------------------------------------------
# Payment requests: list and optional mark paid (PATCH)
# ---------------------------------------------------------------------------

@admin_bp.route("/payment-requests", methods=["GET"])
@jwt_required()
def admin_payment_requests():
    """List payment requests with pagination and status filter."""
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    status = request.args.get("status")

    query = PaymentRequest.query
    if status:
        query = query.filter_by(status=status)

    total = query.count()
    requests = query.order_by(PaymentRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "payment_requests": [r.to_dict() for r in requests],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/payment-requests/<int:req_id>", methods=["PATCH"])
@jwt_required()
def admin_patch_payment_request(req_id):
    """Update payment request status (e.g. approved, rejected, paid)."""
    _, err = require_admin()
    if err:
        return err

    req = PaymentRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "Payment request not found"}), 404

    data = request.get_json() or {}
    if "status" in data and data["status"] in ("pending", "approved", "rejected", "paid"):
        req.status = data["status"]

    db.session.commit()
    return jsonify(req.to_dict()), 200


# ---------------------------------------------------------------------------
# Organizer payment requests (host pays organizer; Stripe links payment_id)
# ---------------------------------------------------------------------------


def _organizer_payment_request_admin_dict(opr: OrganizerPaymentRequest) -> dict:
    d = opr.to_dict()
    ev = opr.event
    if ev:
        d["host_id"] = ev.user_id
        host = ev.creator
        d["host_name"] = host.name if host else None
    else:
        d["host_id"] = None
        d["host_name"] = None
    d["payment_id"] = opr.payment_id
    return d


@admin_bp.route("/organizer-payment-requests", methods=["GET"])
@jwt_required()
def admin_organizer_payment_requests():
    """List organizer payment requests with pagination, status filter, search."""
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    status = request.args.get("status")
    q = (request.args.get("q") or "").strip()

    query = OrganizerPaymentRequest.query
    if status:
        query = query.filter_by(status=status)
    if q:
        like = f"%{q}%"
        query = (
            query.join(Event, OrganizerPaymentRequest.event_id == Event.id)
            .join(User, OrganizerPaymentRequest.organizer_id == User.id)
            .filter(
                or_(
                    Event.name.ilike(like),
                    User.name.ilike(like),
                    User.email.ilike(like),
                )
            )
        )

    total = query.with_entities(func.count(func.distinct(OrganizerPaymentRequest.id))).scalar() or 0
    id_rows = (
        query.with_entities(OrganizerPaymentRequest.id)
        .distinct()
        .order_by(OrganizerPaymentRequest.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    id_list = [row[0] for row in id_rows]
    if not id_list:
        return jsonify({"organizer_payment_requests": [], "total": total, "page": page, "per_page": per_page}), 200
    rows = OrganizerPaymentRequest.query.filter(OrganizerPaymentRequest.id.in_(id_list)).all()
    order_map = {i: n for n, i in enumerate(id_list)}
    rows.sort(key=lambda r: order_map.get(r.id, 0))

    return jsonify({
        "organizer_payment_requests": [_organizer_payment_request_admin_dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/organizer-payment-requests/<int:req_id>", methods=["PATCH"])
@jwt_required()
def admin_patch_organizer_payment_request(req_id):
    """Reject a pending organizer request, or sync paid_at when Stripe already set payment_id."""
    _, err = require_admin()
    if err:
        return err

    opr = OrganizerPaymentRequest.query.get(req_id)
    if not opr:
        return jsonify({"error": "Organizer payment request not found"}), 404

    data = request.get_json() or {}
    if "status" not in data or data["status"] not in ("pending", "paid", "rejected"):
        return jsonify({"error": "status must be one of: pending, paid, rejected"}), 400

    new_status = data["status"]
    if opr.status == "paid":
        return jsonify({"error": "Paid organizer requests cannot be changed"}), 400
    if new_status == "paid":
        if not opr.payment_id:
            return jsonify({
                "error": "Cannot mark as paid without a linked Payment (payment_id). "
                "Complete checkout via Stripe first.",
            }), 400
        opr.status = "paid"
        if not opr.paid_at:
            opr.paid_at = datetime.utcnow()
    elif new_status == "rejected":
        if opr.status != "pending":
            return jsonify({"error": "Only pending requests can be rejected"}), 400
        opr.status = "rejected"
        opr.paid_at = None
    elif new_status == "pending":
        return jsonify({"error": "Reopening to pending is not supported"}), 400

    db.session.commit()
    return jsonify(_organizer_payment_request_admin_dict(opr)), 200


# ---------------------------------------------------------------------------
# Organizers: list with event counts
# ---------------------------------------------------------------------------

@admin_bp.route("/organizers", methods=["GET"])
@jwt_required()
def admin_organizers():
    """List organizers (role=organizer) with pagination, search, and event counts."""
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    q = (request.args.get("q") or "").strip()

    query = User.query.filter_by(role="organizer")
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))

    total = query.count()
    organizers = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    # Add event counts per organizer
    result = []
    for u in organizers:
        events_total = Event.query.filter_by(organizer_id=u.id).count()
        events_pending = Event.query.filter_by(organizer_id=u.id, organizer_status="pending").count()
        d = u.to_dict()
        d["events_total"] = events_total
        d["events_pending"] = events_pending
        result.append(d)

    return jsonify({
        "organizers": result,
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


# ---------------------------------------------------------------------------
# Platform oversight (read-only)
# ---------------------------------------------------------------------------


def _review_admin_dict(r: Review) -> dict:
    d = r.to_dict(include_author=True)
    if r.event:
        d["event_name"] = r.event.name
    return d


@admin_bp.route("/reviews", methods=["GET"])
@jwt_required()
def admin_reviews():
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    event_id = request.args.get("event_id", type=int)
    review_type = request.args.get("review_type")
    status = request.args.get("status")

    query = Review.query
    if event_id is not None:
        query = query.filter_by(event_id=event_id)
    if review_type:
        query = query.filter_by(review_type=review_type)
    if status:
        query = query.filter_by(status=status)

    total = query.count()
    rows = query.order_by(Review.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "reviews": [_review_admin_dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/chat-messages", methods=["GET"])
@jwt_required()
def admin_chat_messages():
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    event_id = request.args.get("event_id", type=int)
    days = request.args.get("days", type=int)

    query = ChatMessage.query
    if event_id is not None:
        query = query.filter_by(event_id=event_id)
    if days is not None and days > 0:
        since = datetime.utcnow() - timedelta(days=min(days, 365))
        query = query.filter(ChatMessage.created_at >= since)

    total = query.count()
    rows = query.order_by(ChatMessage.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "messages": [m.to_dict() for m in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/vendor-agreements", methods=["GET"])
@jwt_required()
def admin_vendor_agreements():
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    event_id = request.args.get("event_id", type=int)

    query = EventVendorAgreement.query
    if event_id is not None:
        query = query.filter_by(event_id=event_id)

    total = query.count()
    rows = query.order_by(EventVendorAgreement.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "agreements": [a.to_dict() for a in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


@admin_bp.route("/budget-plan-items", methods=["GET"])
@jwt_required()
def admin_budget_plan_items():
    _, err = require_admin()
    if err:
        return err

    page = max(1, request.args.get("page", type=int) or 1)
    per_page = min(100, max(1, request.args.get("per_page", type=int) or 20))
    event_id = request.args.get("event_id", type=int)

    query = BudgetPlanItem.query
    if event_id is not None:
        query = query.filter_by(event_id=event_id)

    total = query.count()
    rows = (
        query.order_by(BudgetPlanItem.event_id, BudgetPlanItem.sort_order, BudgetPlanItem.id)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return jsonify({
        "items": [i.to_dict() for i in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }), 200


# ---------------------------------------------------------------------------
# Analytics for dashboard charts
# ---------------------------------------------------------------------------

@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
def admin_analytics():
    """Time-series and aggregates for dashboard: signups, revenue, etc."""
    _, err = require_admin()
    if err:
        return err

    days = min(365, max(7, request.args.get("days", type=int) or 30))
    since = datetime.utcnow() - timedelta(days=days)

    # Signups per day (by created_at)
    signups_raw = (
        db.session.query(func.date(User.created_at).label("date"), func.count(User.id).label("count"))
        .filter(User.created_at >= since)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )
    signups_by_date = [{"date": str(d), "count": c} for d, c in signups_raw]

    # Revenue per day (payments)
    revenue_raw = (
        db.session.query(func.date(Payment.created_at).label("date"), func.coalesce(func.sum(Payment.amount), 0).label("total"))
        .filter(Payment.created_at >= since)
        .group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at))
        .all()
    )
    revenue_by_date = [{"date": str(d), "total": float(t)} for d, t in revenue_raw]

    # Recent activity: last N users, last N payments (for dashboard feed)
    recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()
    recent_payments = Payment.query.order_by(Payment.created_at.desc()).limit(10).all()

    return jsonify({
        "signups_by_date": signups_by_date,
        "revenue_by_date": revenue_by_date,
        "recent_users": [u.to_dict() for u in recent_users],
        "recent_payments": [_payment_admin_dict(p) for p in recent_payments],
    }), 200
