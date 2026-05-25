-- Add room, club meeting schedule, and recurrence columns to events table.
-- Run this in the Supabase SQL editor after the fresh_schema migration.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS room         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meeting_days text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meeting_time text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recurrence   text NOT NULL DEFAULT '';
