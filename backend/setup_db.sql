-- ============================================================
-- FarmPilot — MySQL One-Time Setup
-- ============================================================
-- Run this FIRST (only needed once ever):
--   mysql -u root -p < setup_db.sql
--
-- Then run the Python script to create all tables:
--   cd farmpilot/backend
--   python scripts/setup_database.py
-- ============================================================

CREATE DATABASE IF NOT EXISTS farmpilot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional dedicated app user (skip if using root)
CREATE USER IF NOT EXISTS 'farmpilot_user'@'localhost'
  IDENTIFIED BY 'farmpilot_pass';
GRANT ALL PRIVILEGES ON farmpilot.* TO 'farmpilot_user'@'localhost';
FLUSH PRIVILEGES;

SELECT 'MySQL DB created. Now run: python scripts/setup_database.py' AS next_step;
