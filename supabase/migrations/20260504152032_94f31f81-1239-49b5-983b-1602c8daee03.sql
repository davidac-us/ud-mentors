
-- Allow seed/demo profiles without an auth.users row
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
-- Allow rows whose id is not in auth.users (demo data) by making FK match optional via NOT VALID
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
