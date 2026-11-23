"""
FarmPilot — One-Shot Database Setup Script
==========================================
Run from the farmpilot/ folder (NOT from backend/):

    cd farmpilot
    python -m backend.scripts.setup_database

What it does:
    1. Reads DATABASE_URL from backend/.env
    2. Creates the farmpilot database if it does not exist
    3. Creates all 5 tables
    4. Prints a verification report
"""

import sys
import os
from pathlib import Path

# ── Ensure farmpilot/ is on sys.path so backend.* imports resolve ─────────
ROOT = Path(__file__).resolve().parents[2]   # farmpilot/
sys.path.insert(0, str(ROOT))

# ── Load .env from backend/ explicitly before importing settings ──────────
from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

# ── Now safe to import backend modules ────────────────────────────────────
import pymysql
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError
from urllib.parse import urlparse


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        print("\nERROR: DATABASE_URL not found.")
        print("Make sure backend/.env exists and contains DATABASE_URL=...")
        sys.exit(1)
    return url


def create_database(db_url: str) -> str:
    parsed  = urlparse(db_url)
    db_name = parsed.path.lstrip("/")
    # Build URL without the database name to connect at server level
    root_url = db_url.replace(f"/{db_name}", "/")

    from sqlalchemy import create_engine
    engine = create_engine(root_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            conn.execute(text(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            ))
            conn.commit()
        print(f"  ✓ Database '{db_name}' ready.")
        return db_name
    except Exception as e:
        print(f"  ✗ Could not create database: {e}")
        sys.exit(1)
    finally:
        engine.dispose()


def create_tables():
    # Import all models so SQLAlchemy registers them
    from backend.core.database import Base, engine
    from backend.models.user     import User        # noqa
    from backend.models.project  import Project     # noqa
    from backend.models.activity import Activity    # noqa
    from backend.models.reminder import Reminder    # noqa
    from backend.models.chat     import ChatMessage # noqa

    try:
        Base.metadata.create_all(bind=engine)
        print("  ✓ Tables created.")
        return engine
    except OperationalError as e:
        print(f"\n  ✗ Could not connect to MySQL: {e}")
        print("\n  Check:")
        print("    1. MySQL service is running")
        print("    2. DATABASE_URL password in backend/.env is correct")
        sys.exit(1)


def verify(engine):
    inspector = inspect(engine)
    tables    = inspector.get_table_names()
    expected  = {"users", "projects", "activities", "reminders", "chat_messages"}
    missing   = expected - set(tables)

    print(f"\n  {'─'*52}")
    print(f"  {'TABLE':<25} COLUMNS")
    print(f"  {'─'*52}")
    for t in sorted(tables):
        cols = [c["name"] for c in inspector.get_columns(t)]
        print(f"  ✓ {t:<25} {', '.join(cols[:5])}{'...' if len(cols)>5 else ''}")
    print(f"  {'─'*52}")

    if missing:
        print(f"\n  ✗ Missing: {missing}")
        return False
    return True


def main():
    print("=" * 55)
    print("  FarmPilot — Database Setup")
    print("=" * 55)

    db_url = get_db_url()
    host   = urlparse(db_url).hostname
    print(f"\n  Connecting to MySQL at {host}...")

    print("\n[1/3] Creating database if needed...")
    create_database(db_url)

    print("\n[2/3] Creating all tables...")
    engine = create_tables()

    print("\n[3/3] Verifying tables...")
    ok = verify(engine)

    print("\n" + "=" * 55)
    if ok:
        print("  ✓ Database setup complete!")
        print("\n  Now start the backend:")
        print("    cd farmpilot")
        print("    python -m uvicorn backend.main:app --reload")
        print("=" * 55)
        sys.exit(0)
    else:
        print("  ✗ Setup incomplete — some tables missing.")
        sys.exit(1)


if __name__ == "__main__":
    main()
