"""Utility to read Gmail requests and respond with available Google Calendar slots."""

from __future__ import annotations

import base64
import os
from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import List, Tuple

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
]


def _get_credentials(token_file: str = "token.json") -> Credentials:
    """Load OAuth credentials from ``token_file``.

    ``token.json`` and ``credentials.json`` should be generated via the
    Google API OAuth flow. This function assumes that ``token.json`` exists
    and is valid.
    """

    if not os.path.exists(token_file):
        raise FileNotFoundError(
            "Missing OAuth token. Run the Google API OAuth flow to create token.json"
        )

    return Credentials.from_authorized_user_file(token_file, SCOPES)


def build_gmail_service(creds: Credentials):
    """Return an authenticated Gmail API service."""

    return build("gmail", "v1", credentials=creds)


def build_calendar_service(creds: Credentials):
    """Return an authenticated Google Calendar API service."""

    return build("calendar", "v3", credentials=creds)


def list_unread_messages(service) -> List[dict]:
    """List unread messages that contain a scheduling request."""

    result = (
        service.users()
        .messages()
        .list(userId="me", labelIds=["UNREAD"], q="subject:schedule")
        .execute()
    )
    return result.get("messages", [])


def _isoformat(dt: datetime) -> str:
    return dt.isoformat() + "Z"


def find_free_slots(calendar_service, days: int = 7) -> List[Tuple[datetime, datetime]]:
    """Return free time slots on the primary calendar for the next ``days`` days."""

    now = datetime.utcnow()
    body = {
        "timeMin": _isoformat(now),
        "timeMax": _isoformat(now + timedelta(days=days)),
        "items": [{"id": "primary"}],
    }
    freebusy = calendar_service.freebusy().query(body=body).execute()
    busy_blocks = freebusy["calendars"]["primary"].get("busy", [])

    slots = []
    start = now
    for block in busy_blocks:
        busy_start = datetime.fromisoformat(block["start"].rstrip("Z"))
        if start < busy_start:
            slots.append((start, busy_start))
        start = datetime.fromisoformat(block["end"].rstrip("Z"))

    end_period = now + timedelta(days=days)
    if start < end_period:
        slots.append((start, end_period))

    return slots


def _build_reply(to_addr: str, slots: List[Tuple[datetime, datetime]]) -> EmailMessage:
    """Create a reply email listing up to three available time slots."""

    msg = EmailMessage()
    msg["To"] = to_addr
    msg["Subject"] = "Available meeting times"

    lines = ["Here are some available slots:"]
    for start, end in slots[:3]:
        lines.append(f"- {start.strftime('%Y-%m-%d %H:%M')} - {end.strftime('%H:%M')}")
    msg.set_content("\n".join(lines))
    return msg


def send_message(service, message: EmailMessage, thread_id: str | None = None):
    """Send ``message`` through the Gmail API."""

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    body = {"raw": raw}
    if thread_id:
        body["threadId"] = thread_id
    service.users().messages().send(userId="me", body=body).execute()


def process_messages():
    """Fetch unread scheduling requests and reply with free slots."""

    creds = _get_credentials()
    gmail = build_gmail_service(creds)
    calendar = build_calendar_service(creds)

    for msg in list_unread_messages(gmail):
        full = (
            gmail.users()
            .messages()
            .get(userId="me", id=msg["id"], format="metadata", metadataHeaders=["From"])
            .execute()
        )
        headers = {h["name"].lower(): h["value"] for h in full["payload"]["headers"]}
        from_addr = headers.get("from", "")

        slots = find_free_slots(calendar)
        reply = _build_reply(from_addr, slots)
        send_message(gmail, reply, thread_id=full.get("threadId"))

        gmail.users().messages().modify(
            userId="me", id=msg["id"], body={"removeLabelIds": ["UNREAD"]}
        ).execute()


if __name__ == "__main__":
    # NOTE: Running this script requires valid Google API credentials.
    process_messages()
