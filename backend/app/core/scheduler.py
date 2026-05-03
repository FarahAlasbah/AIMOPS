# backend/app/core/scheduler.py
"""
File: backend/app/core/scheduler.py
Purpose: Central scheduler configuration for all background jobs in AIMOPS.

WHY app/core/:
Scheduler is infrastructure — like database.py and config.py.
It doesn't belong in services (business logic) or api (HTTP layer).
Any new scheduled job gets added here, main.py never changes.

ADDING A NEW JOB:
Just add another scheduler.add_job() call below.

CURRENT JOBS:
- campaign_end_check: daily at 08:00 — detects ended campaigns, notifies users
"""

from apscheduler.schedulers.background import BackgroundScheduler
from app.services.campaign_scheduler import check_ended_campaigns


# ============================================
# Scheduler Instance
# ============================================

# BackgroundScheduler runs in a separate thread.
# It does not block or slow down any API requests.
scheduler = BackgroundScheduler(
    job_defaults={
        'coalesce': True,       # If job missed multiple runs, only run once on recovery
        'max_instances': 1      # Never run the same job twice simultaneously
    }
)


# ============================================
# Job: Campaign End Check
# ============================================

scheduler.add_job(
    check_ended_campaigns,
    trigger='cron',
    hour=8,
    minute=0,
    id='campaign_end_check',
    replace_existing=True,    # Safe to restart without duplicate jobs
    misfire_grace_time=3600   # If server was down at 08:00, run within 1 hour of recovery
)


# ============================================
# Future Jobs (add here when needed)
# ============================================

# Example — event reminders (not built yet):
# scheduler.add_job(
#     check_upcoming_events,
#     trigger='cron',
#     hour=9,
#     minute=0,
#     id='event_reminder_check',
#     replace_existing=True,
#     misfire_grace_time=3600
# )