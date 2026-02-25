ALTER TABLE public.users ADD COLUMN IF NOT EXISTS logout_at timestamp without time zone;
ALTER TABLE public.orga ADD COLUMN IF NOT EXISTS logout_at timestamp without time zone;
