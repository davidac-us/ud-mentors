-- ============================================================
-- UD Mentor Match — fresh schema (replaces Lovable-generated tables)
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Drop everything (old Lovable tables + any previously created new tables)
DROP TABLE IF EXISTS public.community_room_members CASCADE;
DROP TABLE IF EXISTS public.community_messages CASCADE;
DROP TABLE IF EXISTS public.community_rooms CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.profile_interests CASCADE;
DROP TABLE IF EXISTS public.profile_languages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.thread_members CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
DROP TABLE IF EXISTS public.match_requests CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop old types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.event_kind CASCADE;
DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.thread_kind CASCADE;

-- Drop old functions / triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.has_role(_role text, _user_id uuid);
DROP FUNCTION IF EXISTS public.is_thread_member(_thread_id uuid, _user_id uuid);

-- ============================================================
-- NEW TABLES
-- ============================================================

CREATE TABLE public.profiles (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL DEFAULT '',
  role          text        CHECK (role IN ('mentee', 'mentor')),
  country       text,
  university    text        DEFAULT 'University of Delaware',
  year          text,
  major         text,
  fun_fact      text,
  best_advice   text,
  mentor_prompt text,   -- mentee writes: "I'm looking for a mentor who..."
  mentee_prompt text,   -- mentor writes: "Mentees I'd love to meet..."
  mentee_cap    integer CHECK (mentee_cap BETWEEN 1 AND 5),
  onboarded     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profile_languages (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language   text NOT NULL,
  PRIMARY KEY (profile_id, language)
);

CREATE TABLE public.profile_interests (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest   text NOT NULL,
  PRIMARY KEY (profile_id, interest)
);

-- match_status: pending → matched | declined
CREATE TABLE public.matches (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'declined')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  responded_at   timestamptz,
  expires_at     timestamptz NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  cooldown_until timestamptz,
  UNIQUE (mentee_id, mentor_id)
);

CREATE TABLE public.messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_rooms (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text        NOT NULL CHECK (type IN ('global', 'language', 'group')),
  name          text        NOT NULL,
  language_code text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid        NOT NULL REFERENCES public.community_rooms(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only used for group rooms (not global/language)
CREATE TABLE public.community_room_members (
  room_id    uuid        NOT NULL REFERENCES public.community_rooms(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);

CREATE TABLE public.events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('event', 'club')),
  title       text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  date        timestamptz,
  location    text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX ON public.matches (mentee_id);
CREATE INDEX ON public.matches (mentor_id);
CREATE INDEX ON public.matches (status);
CREATE INDEX ON public.messages (match_id, created_at);
CREATE INDEX ON public.community_messages (room_id, created_at);
CREATE INDEX ON public.profiles (user_id);
CREATE INDEX ON public.profile_languages (profile_id);
CREATE INDEX ON public.profile_interests (profile_id);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO public.community_rooms (type, name) VALUES ('global', 'Global Chat');

INSERT INTO public.community_rooms (type, name, language_code) VALUES
  ('language', 'English Chat',    'en'),
  ('language', 'Spanish Chat',    'es'),
  ('language', 'Portuguese Chat', 'pt'),
  ('language', 'Chinese Chat',    'zh'),
  ('language', 'Arabic Chat',     'ar'),
  ('language', 'French Chat',     'fr');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: authenticated users can read all"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles: users can insert their own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles: users can update their own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- profile_languages
CREATE POLICY "profile_languages: authenticated can read"
  ON public.profile_languages FOR SELECT TO authenticated USING (true);

CREATE POLICY "profile_languages: own profile insert"
  ON public.profile_languages FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "profile_languages: own profile delete"
  ON public.profile_languages FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- profile_interests
CREATE POLICY "profile_interests: authenticated can read"
  ON public.profile_interests FOR SELECT TO authenticated USING (true);

CREATE POLICY "profile_interests: own profile insert"
  ON public.profile_interests FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "profile_interests: own profile delete"
  ON public.profile_interests FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- matches
CREATE POLICY "matches: participants can read"
  ON public.matches FOR SELECT TO authenticated
  USING (
    mentee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR mentor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "matches: mentee can create"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (mentee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "matches: participants can update"
  ON public.matches FOR UPDATE TO authenticated
  USING (
    mentee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR mentor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- messages
CREATE POLICY "messages: match participants can read"
  ON public.messages FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM public.matches
      WHERE mentee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR mentor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "messages: matched participants can send"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND match_id IN (
      SELECT id FROM public.matches
      WHERE status = 'matched'
        AND (mentee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          OR mentor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    )
  );

-- community_rooms
CREATE POLICY "community_rooms: authenticated can read"
  ON public.community_rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "community_rooms: authenticated can create groups"
  ON public.community_rooms FOR INSERT TO authenticated WITH CHECK (true);

-- community_messages
CREATE POLICY "community_messages: authenticated can read"
  ON public.community_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "community_messages: authenticated can send"
  ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- community_room_members
CREATE POLICY "community_room_members: authenticated can read"
  ON public.community_room_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "community_room_members: own membership insert"
  ON public.community_room_members FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "community_room_members: own membership delete"
  ON public.community_room_members FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- events
CREATE POLICY "events: authenticated can read"
  ON public.events FOR SELECT TO authenticated USING (true);

CREATE POLICY "events: authenticated can post"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (poster_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================
-- GRANTS
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, onboarded)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    false
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
