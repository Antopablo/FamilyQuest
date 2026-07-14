-- Add the two notification_type values the app already sends (missionsStore:
-- 'mission_available' when a parent assigns a mission, 'mission_claimed' when a
-- child claims one). They were missing from the enum, so those inserts silently
-- failed. Adding them fixes the bug and lets the generated types stay accurate.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mission_available';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mission_claimed';
