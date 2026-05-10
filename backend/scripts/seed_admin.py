"""
File: backend/scripts/seed_admin.py
Purpose: One-time setup script to create the initial admin account.

WHEN TO RUN:
    First time AIMOPS is deployed for a new business client.
    Run once — if the admin already exists, the script exits safely.

HOW TO RUN:
    From the backend directory:
    python scripts/seed_admin.py

WHAT IT DOES:
    1. Connects to the database using your .env settings
    2. Checks if an admin account already exists
    3. If not, creates one with a temporary password
    4. Prints the credentials to the terminal for the deployer to hand to the client
    5. The admin must change their password on first login
"""

import sys
import os

# ── Make sure app modules are importable ──
# This script lives in backend/scripts/ but needs to import from backend/app/
# Adding the parent directory (backend/) to the path fixes this
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password
import secrets
import string


def generate_temp_password(length: int = 12) -> str:
    """
    Generate a secure random temporary password.

    WHY NOT HARDCODED:
    A hardcoded password like 'Admin1234' is dangerous — it's the same
    for every AIMOPS deployment and anyone who reads this script knows it.
    A random password is different every time and printed once to the terminal.

    FORMAT: letters + digits + 2 special characters
    Example output: Xk9mP2qL#nR!
    """
    alphabet = string.ascii_letters + string.digits
    special = "!@#$%"

    # Generate 10 random alphanumeric characters
    base = [secrets.choice(alphabet) for _ in range(length - 2)]

    # Add 2 special characters
    base += [secrets.choice(special) for _ in range(2)]

    # Shuffle so special characters aren't always at the end
    secrets.SystemRandom().shuffle(base)

    return ''.join(base)


def seed_admin():
    db: Session = SessionLocal()

    try:
        # ── Step 1: Find the admin role ──
        admin_role = db.query(Role).filter(Role.role_name == 'admin').first()

        if not admin_role:
            print("❌ Error: 'admin' role not found in the database.")
            print("   Make sure you've run 'alembic upgrade head' first.")
            print("   The roles table must be seeded before running this script.")
            sys.exit(1)

        # ── Step 2: Check if an admin already exists ──
        existing_admin = db.query(User).join(Role).filter(
            Role.role_name == 'admin',
            User.status == 'active'
        ).first()

        if existing_admin:
            print(f"✅ Admin account already exists: '{existing_admin.username}'")
            print("   No changes made. Use the existing admin to manage users.")
            sys.exit(0)

        # ── Step 3: Get business info from input ──
        print("=" * 50)
        print("  AIMOPS — Initial Admin Setup")
        print("=" * 50)
        print()

        username = input("Enter admin username: ").strip().lower()
        if not username or len(username) < 3:
            print("❌ Username must be at least 3 characters.")
            sys.exit(1)

        email = input("Enter admin email: ").strip().lower()
        if not email or '@' not in email:
            print("❌ Invalid email address.")
            sys.exit(1)

        full_name = input("Enter admin full name: ").strip()
        if not full_name:
            print("❌ Full name is required.")
            sys.exit(1)

        # ── Step 4: Check username/email not already taken ──
        username_taken = db.query(User).filter(
            User.username == username,
            User.status == 'active'
        ).first()

        if username_taken:
            print(f"❌ Username '{username}' is already taken.")
            sys.exit(1)

        email_taken = db.query(User).filter(
            User.email == email,
            User.status == 'active'
        ).first()

        if email_taken:
            print(f"❌ Email '{email}' is already registered.")
            sys.exit(1)

        # ── Step 5: Generate temporary password ──
        temp_password = generate_temp_password()

        # ── Step 6: Create the admin user ──
        admin_user = User(
            username=username,
            email=email,
            full_name=full_name,
            password_hash=hash_password(temp_password),
            role_id=admin_role.role_id,
            status='active',
            failed_login_attempts=0,
            locked_until=None
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        # ── Step 7: Print credentials ──
        print()
        print("=" * 50)
        print("  ✅ Admin account created successfully!")
        print("=" * 50)
        print(f"  Username  : {username}")
        print(f"  Email     : {email}")
        print(f"  Password  : {temp_password}")
        print()
        print("  ⚠️  Give these credentials to the client.")
        print("  ⚠️  Ask them to change the password immediately after first login.")
        print("  ⚠️  This password is NOT stored anywhere — if lost, reset manually.")
        print("=" * 50)

    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled.")
        sys.exit(0)

    except Exception as e:
        db.rollback()
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()