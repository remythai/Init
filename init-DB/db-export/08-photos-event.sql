--
-- Migration: Add event_id to photos table
-- Description: Allow photos to be specific to an event (null = general profile photo)
--

-- Add event_id column (nullable - null means general profile photo)
ALTER TABLE public.photos
    ADD COLUMN event_id integer;

-- Add display_order for ordering photos
ALTER TABLE public.photos
    ADD COLUMN display_order integer DEFAULT 0;

-- Add is_primary flag for primary photo per context
ALTER TABLE public.photos
    ADD COLUMN is_primary boolean DEFAULT false;

-- Foreign key to events
ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Index for faster queries by event
CREATE INDEX idx_photos_event_id ON public.photos USING btree (event_id);

-- Index for user + event combination
CREATE INDEX idx_photos_user_event ON public.photos USING btree (user_id, event_id);

-- Ensure only one primary photo per user per event context
CREATE UNIQUE INDEX idx_photos_primary_per_context
    ON public.photos (user_id, COALESCE(event_id, 0))
    WHERE is_primary = true;
