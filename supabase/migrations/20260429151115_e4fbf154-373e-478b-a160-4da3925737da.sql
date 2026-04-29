
-- Enums
CREATE TYPE public.app_role AS ENUM ('first_year', 'mentor', 'admin');
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.thread_kind AS ENUM ('match', 'group', 'global');
CREATE TYPE public.event_kind AS ENUM ('event', 'club');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'first_year',
  home_country TEXT DEFAULT '',
  university TEXT DEFAULT '',
  academic_year TEXT DEFAULT '',
  major TEXT DEFAULT '',
  languages TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  prompt_fun_fact TEXT DEFAULT '',
  prompt_advice TEXT DEFAULT '',
  prompt_looking_for TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  discoverable BOOLEAN NOT NULL DEFAULT true,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Swipes
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, target_id)
);

-- Match requests (mentee -> mentor)
CREATE TABLE public.match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  thread_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentee_id, mentor_id)
);

-- Threads
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.thread_kind NOT NULL,
  name TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Thread members
CREATE TABLE public.thread_members (
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- Helper function: is the current user a member of a thread?
CREATE OR REPLACE FUNCTION public.is_thread_member(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_members
    WHERE thread_id = _thread_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.threads
    WHERE id = _thread_id AND kind = 'global'
  )
$$;

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.event_kind NOT NULL DEFAULT 'event',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the global chat thread on init
INSERT INTO public.threads (id, kind, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'global', 'Global Chat');

-- Enable RLS on everything
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Swipes policies
CREATE POLICY "Users can view own swipes"
  ON public.swipes FOR SELECT TO authenticated
  USING (auth.uid() = swiper_id);

CREATE POLICY "Users can create own swipes"
  ON public.swipes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = swiper_id);

-- Match request policies
CREATE POLICY "Users see requests they're part of"
  ON public.match_requests FOR SELECT TO authenticated
  USING (auth.uid() = mentee_id OR auth.uid() = mentor_id);

CREATE POLICY "Mentees create requests"
  ON public.match_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY "Mentor or mentee update request"
  ON public.match_requests FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Threads policies
CREATE POLICY "View threads you are in or global"
  ON public.threads FOR SELECT TO authenticated
  USING (kind = 'global' OR public.is_thread_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create threads"
  ON public.threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Thread members policies
CREATE POLICY "View memberships of your threads"
  ON public.thread_members FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Add members to threads you're in (or self-join)"
  ON public.thread_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_thread_member(thread_id, auth.uid()));

-- Messages policies
CREATE POLICY "View messages in your threads"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Send messages to your threads"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_thread_member(thread_id, auth.uid()));

-- Events policies
CREATE POLICY "Anyone authenticated can view events"
  ON public.events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_requests;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER match_requests_touch BEFORE UPDATE ON public.match_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
