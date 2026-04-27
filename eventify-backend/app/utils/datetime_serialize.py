"""Serialize datetimes to ISO 8601 in UTC with Z suffix for unambiguous client parsing."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def isoformat_utc_z(dt: Optional[datetime]) -> Optional[str]:
    """If naive, treat as UTC. Return ISO 8601 ending in Z (e.g. 2025-04-27T10:00:00Z)."""
    if not dt:
        return None
    u = (
        dt.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None
        else dt.astimezone(timezone.utc)
    )
    s = u.isoformat()
    if s.endswith("+00:00"):
        return s[:-6] + "Z"
    return s
