-- Allow event posters to update and delete their own posts.
-- Run this in the Supabase SQL editor.

CREATE POLICY "events: poster can update"
  ON public.events FOR UPDATE TO authenticated
  USING (poster_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "events: poster can delete"
  ON public.events FOR DELETE TO authenticated
  USING (poster_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
