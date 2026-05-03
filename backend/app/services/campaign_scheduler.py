# backend/app/services/campaign_scheduler.py
"""
File: backend/app/services/campaign_scheduler.py
Purpose: Daily background job that detects campaigns that have ended
         and notifies all marketing users and admins to upload new sales data.

HOW IT WORKS:
- Runs once per day via APScheduler (wired in main.py)
- Finds all campaigns where end_date < today and status = 'active'
- For each ended campaign, checks if a notification was already sent
- If not sent yet → sends one notification per eligible user
- Marks the campaign as 'completed' so it won't trigger again

WHY WE CHECK FOR EXISTING NOTIFICATIONS:
Safety net in case the scheduler runs more than once,
or the server was down and we're catching up on multiple missed days.
Each campaign only ever produces ONE notification per user — no spam.

WHO GETS NOTIFIED:
All users with role 'marketing_user' or 'admin'.
Any of them can upload the new sales data, so all of them need to know.
"""

from datetime import date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.campaign import Campaign
from app.models.notification import Notification
from app.models.user import User
from app.models.role import Role


def check_ended_campaigns():
    """
    Entry point called by APScheduler once per day.

    Opens its own DB session (scheduler runs outside request context),
    finds all overdue active campaigns, sends notifications, closes session.

    WHY ITS OWN SESSION:
    FastAPI's get_db() is tied to HTTP requests.
    Background jobs need to manage their own session lifecycle.
    """
    db: Session = SessionLocal()
    try:
        _process_ended_campaigns(db)
    except Exception as e:
        # Log but don't crash the scheduler
        print(f"[CampaignScheduler] Error during check: {e}")
    finally:
        db.close()


def _process_ended_campaigns(db: Session):
    """
    Core logic — separated from check_ended_campaigns()
    so it can be tested independently.
    """
    today = date.today()

    # ── Find all active campaigns whose end date has passed ──
    # Using < today (not <=) because a campaign ending today is still running.
    ended_campaigns = db.query(Campaign).filter(
        Campaign.deleted_at.is_(None),
        Campaign.status == 'active',
        Campaign.end_date < today
    ).all()

    if not ended_campaigns:
        print(f"[CampaignScheduler] No ended campaigns found on {today}")
        return

    print(f"[CampaignScheduler] Found {len(ended_campaigns)} ended campaign(s) to process")

    # ── Get all marketing users and admins ──
    eligible_users = db.query(User).join(Role).filter(
        User.status == 'active',
        Role.role_name.in_(['marketing_user', 'admin'])
    ).all()

    if not eligible_users:
        print("[CampaignScheduler] No eligible users found to notify")
        return

    eligible_user_ids = [u.user_id for u in eligible_users]

    notifications_created = 0

    for campaign in ended_campaigns:
        # ── Check which users already got notified for this campaign ──
        # We use related_id = campaign_id and related_type = 'campaign'
        # to identify campaign-end notifications uniquely.
        already_notified_user_ids = set(
            row.user_id
            for row in db.query(Notification.user_id).filter(
                Notification.related_id == campaign.campaign_id,
                Notification.related_type == 'campaign',
                Notification.notification_type == 'system',
                Notification.user_id.in_(eligible_user_ids)
            ).all()
        )

        # ── Send notification to users who haven't received one yet ──
        for user in eligible_users:
            if user.user_id in already_notified_user_ids:
                continue

            days_ended = (today - campaign.end_date).days
            if days_ended == 1:
                when_str = "yesterday"
            elif days_ended <= 7:
                when_str = f"{days_ended} days ago"
            else:
                when_str = f"on {campaign.end_date.strftime('%b %d')}"

            notification = Notification(
                user_id=user.user_id,
                notification_type='system',
                title=f"Campaign Ended: {campaign.campaign_name}",
                message=(
                    f"The campaign '{campaign.campaign_name}' ended {when_str}. "
                    f"Upload your latest sales data so AIMOPS can calculate "
                    f"the actual results and update your forecasts."
                ),
                related_id=campaign.campaign_id,
                related_type='campaign',
                is_read=False,
                email_sent=False
            )
            db.add(notification)
            notifications_created += 1

        # ── Mark campaign as completed ──
        # This stops it from appearing in future scheduler runs.
        # record_results() in campaign_service.py will also set this,
        # but we set it here so the scheduler doesn't re-process it
        # before the user uploads their data.
        campaign.status = 'completed'

    db.commit()
    print(
        f"[CampaignScheduler] Done — "
        f"{notifications_created} notification(s) created for "
        f"{len(ended_campaigns)} campaign(s)"
    )