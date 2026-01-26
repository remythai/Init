--
-- Likes table (swipes)
--

-- -----------------------------------------------------------------------------
-- Table: likes
-- Description: Records user swipes (like/pass) within an event context
-- -----------------------------------------------------------------------------
CREATE TABLE public.likes (
    liker_id integer NOT NULL,
    liked_id integer NOT NULL,
    event_id integer NOT NULL,
    is_like boolean NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.likes OWNER TO dating_admin;

-- Primary key (composite: one swipe per user pair per event)
ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (liker_id, liked_id, event_id);

-- Foreign keys
ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_liker_id_fkey
    FOREIGN KEY (liker_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_liked_id_fkey
    FOREIGN KEY (liked_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Indexes for faster lookups
CREATE INDEX idx_likes_liker_event ON public.likes USING btree (liker_id, event_id);
CREATE INDEX idx_likes_liked_event ON public.likes USING btree (liked_id, event_id);

-- Constraint: cannot like yourself
ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_no_self_like CHECK (liker_id <> liked_id);
