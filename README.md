# gmail-autorep

This project provides a small utility to read Gmail for scheduling requests and
reply with available slots from Google Calendar.

## Setup

1. Enable the Gmail and Calendar APIs in a Google Cloud project.
2. Obtain OAuth credentials and generate `token.json` using the Google API
   quickstart guides.
3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the script to process unread messages with "schedule" in the subject and
reply with up to three available time slots from your primary calendar:

```bash
python auto_schedule.py
```

The script marks handled messages as read.
