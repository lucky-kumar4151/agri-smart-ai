"""
Centralized timestamp utilities for AgriSmart.

Every timestamp stored in MongoDB MUST use `utc_now_iso()` so the
frontend can correctly compute relative time ("5m ago", "2h ago", etc.).

The key issue: `datetime.utcnow().isoformat()` produces strings like
"2026-03-17T18:30:00" — with NO timezone indicator.  When the browser's
`new Date(...)` parses this, it treats it as LOCAL time, causing the
"time ago" calculation to be off by the user's UTC offset (e.g. 5.5h
for IST).

Fix: always append "Z" (UTC indicator) so the browser knows it's UTC.
"""

from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Return current UTC time as an ISO 8601 string with 'Z' suffix.

    Example: "2026-03-17T18:30:08.123456Z"
    """
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
