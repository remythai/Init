--
-- Matching & Messaging tables
--

-- -----------------------------------------------------------------------------
-- Table: matches
-- Description: Matches between two users (potentially from an event)
-- -----------------------------------------------------------------------------
CREATE TABLE public.matches (
    id integer NOT NULL,
    user1_id integer NOT NULL,
    user2_id integer NOT NULL,
    event_id integer NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.matches OWNER TO dating_admin;

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.matches_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;
ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.matches ADD CONSTRAINT matches_pkey PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user1_id_fkey
    FOREIGN KEY (user1_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user2_id_fkey
    FOREIGN KEY (user2_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Unique index to prevent duplicate matches per event (A-B same as B-A for a given event)
CREATE UNIQUE INDEX unique_match_pair_event ON public.matches USING btree (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id), event_id);

-- Index for faster user match lookups
CREATE INDEX idx_matches_user1 ON public.matches USING btree (user1_id);
CREATE INDEX idx_matches_user2 ON public.matches USING btree (user2_id);
CREATE INDEX idx_matches_event ON public.matches USING btree (event_id);
CREATE INDEX idx_matches_archived ON public.matches USING btree (is_archived) WHERE is_archived = false;

-- -----------------------------------------------------------------------------
-- Table: messages
-- Description: Messages exchanged between matched users
-- -----------------------------------------------------------------------------
CREATE TABLE public.messages (
    id integer NOT NULL,
    match_id integer NOT NULL,
    sender_id integer NOT NULL,
    content text NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_read boolean DEFAULT false,
    is_liked boolean DEFAULT false
);

ALTER TABLE public.messages OWNER TO dating_admin;

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.messages_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;
ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_match_id_fkey
    FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_messages_match_id ON public.messages USING btree (match_id);
CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);
