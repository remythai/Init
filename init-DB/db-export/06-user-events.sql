--
-- User-Event relations
--

-- -----------------------------------------------------------------------------
-- Table: user_event_rel
-- Description: User participation in events with custom profile info
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_event_rel (
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    profil_info jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.user_event_rel OWNER TO dating_admin;

-- Primary key
ALTER TABLE ONLY public.user_event_rel ADD CONSTRAINT user_event_rel_pkey PRIMARY KEY (user_id, event_id);

-- Foreign keys
ALTER TABLE ONLY public.user_event_rel
    ADD CONSTRAINT user_event_rel_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_event_rel
    ADD CONSTRAINT user_event_rel_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Index
CREATE INDEX idx_user_event_rel_profil_info ON public.user_event_rel USING gin (profil_info);

-- Trigger
CREATE TRIGGER update_user_event_rel_updated_at
    BEFORE UPDATE ON public.user_event_rel
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
