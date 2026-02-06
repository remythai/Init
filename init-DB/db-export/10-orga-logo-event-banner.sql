-- Add logo_path to orga table (organizer logo)
ALTER TABLE public.orga ADD COLUMN IF NOT EXISTS logo_path character varying(255);

-- Add banner_path to events table (custom event banner)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS banner_path character varying(255);
