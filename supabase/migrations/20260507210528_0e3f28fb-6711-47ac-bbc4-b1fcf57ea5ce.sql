-- Insert global language-based chat threads (idempotent)
INSERT INTO public.threads (id, kind, name, created_by) VALUES
  ('00000000-0000-0000-0000-0000000000a1','global','English Chat',NULL),
  ('00000000-0000-0000-0000-0000000000a2','global','Spanish Chat',NULL),
  ('00000000-0000-0000-0000-0000000000a3','global','Portuguese Chat',NULL),
  ('00000000-0000-0000-0000-0000000000a4','global','Chinese Chat',NULL),
  ('00000000-0000-0000-0000-0000000000a5','global','Arabic Chat',NULL),
  ('00000000-0000-0000-0000-0000000000a6','global','French Chat',NULL)
ON CONFLICT (id) DO NOTHING;