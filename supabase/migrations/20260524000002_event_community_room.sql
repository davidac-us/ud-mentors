-- Link club events to their auto-created community group chat room.
-- Run this in the Supabase SQL editor.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS community_room_id uuid
    REFERENCES public.community_rooms(id) ON DELETE SET NULL;
