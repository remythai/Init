-- ============================================================
-- Source: 00-functions.sql
-- ============================================================

--
-- Functions & Triggers definitions
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- -----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Description: Automatically updates updated_at timestamp on row update
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_updated_at_column() OWNER TO dating_admin;


-- ============================================================
-- Source: 01-users.sql
-- ============================================================

--
-- Users & Photos tables
--

-- -----------------------------------------------------------------------------
-- Table: users
-- Description: Application users (participants)
-- -----------------------------------------------------------------------------
CREATE TABLE public.users (
    id integer NOT NULL,
    firstname character varying(100) NOT NULL,
    lastname character varying(100) NOT NULL,
    mail character varying(255),
    tel character varying(20) NOT NULL,
    birthday date NOT NULL,
    password_hash character varying(255) NOT NULL,
    logout_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.users OWNER TO dating_admin;

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Unique constraints
CREATE UNIQUE INDEX unique_mail ON public.users (LOWER(mail));
ALTER TABLE ONLY public.users ADD CONSTRAINT unique_tel UNIQUE (tel);

-- Indexes
CREATE INDEX idx_user_mail ON public.users USING btree (LOWER(mail));
CREATE INDEX idx_user_tel ON public.users USING btree (tel);
CREATE INDEX idx_user_birthday ON public.users USING btree (birthday);

-- Trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: photos
-- Description: User profile photos
-- -----------------------------------------------------------------------------
CREATE TABLE public.photos (
    id integer NOT NULL,
    user_id integer NOT NULL,
    file_path text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.photos OWNER TO dating_admin;

CREATE SEQUENCE public.photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.photos_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.photos_id_seq OWNED BY public.photos.id;
ALTER TABLE ONLY public.photos ALTER COLUMN id SET DEFAULT nextval('public.photos_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.photos ADD CONSTRAINT photos_pkey PRIMARY KEY (id);

-- Foreign key
ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- ============================================================
-- Source: 02-orga.sql
-- ============================================================

--
-- Organizations table
--

-- -----------------------------------------------------------------------------
-- Table: orga
-- Description: Organizations that create and manage events
-- -----------------------------------------------------------------------------
CREATE TABLE public.orga (
    id integer NOT NULL,
    nom character varying(255) NOT NULL,
    mail character varying(255) NOT NULL,
    description text,
    tel character varying(20),
    password_hash character varying(255) NOT NULL,
    logout_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.orga OWNER TO dating_admin;

CREATE SEQUENCE public.orga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.orga_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.orga_id_seq OWNED BY public.orga.id;
ALTER TABLE ONLY public.orga ALTER COLUMN id SET DEFAULT nextval('public.orga_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.orga ADD CONSTRAINT orga_pkey PRIMARY KEY (id);

-- Unique constraint (case-insensitive)
CREATE UNIQUE INDEX orga_mail_key ON public.orga (LOWER(mail));

-- Index
CREATE INDEX idx_orga_mail ON public.orga USING btree (LOWER(mail));

-- Trigger
CREATE TRIGGER update_orga_updated_at
    BEFORE UPDATE ON public.orga
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Source: 03-events.sql
-- ============================================================

--
-- Events and related tables
--

-- -----------------------------------------------------------------------------
-- Table: events
-- Description: Dating events organized by organizations
-- -----------------------------------------------------------------------------
CREATE TABLE public.events (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text DEFAULT ' '::text NOT NULL,
    location text,
    orga_id integer NOT NULL,
    -- Physical event dates (optional)
    start_at timestamp without time zone,
    end_at timestamp without time zone,
    event_date timestamp without time zone,
    -- App availability dates (required)
    app_start_at timestamp without time zone NOT NULL,
    app_end_at timestamp without time zone NOT NULL,
    -- Theme
    theme character varying(50) DEFAULT 'général'::character varying,
    cooldown interval,
    max_participants integer,
    is_public boolean DEFAULT true NOT NULL,
    has_whitelist boolean DEFAULT false NOT NULL,
    has_link_access boolean DEFAULT false NOT NULL,
    has_password_access boolean DEFAULT false NOT NULL,
    access_password_hash text,
    custom_fields jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_physical_event_dates CHECK ((start_at IS NULL AND end_at IS NULL) OR (end_at > start_at)),
    CONSTRAINT chk_app_dates CHECK ((app_end_at > app_start_at))
);

ALTER TABLE public.events OWNER TO dating_admin;

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.events_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;
ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);

-- Foreign key
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_orga_id_fkey
    FOREIGN KEY (orga_id) REFERENCES public.orga(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_events_orga_id ON public.events USING btree (orga_id);
CREATE INDEX idx_events_start_at ON public.events USING btree (start_at);
CREATE INDEX idx_events_app_start_at ON public.events USING btree (app_start_at);
CREATE INDEX idx_events_app_end_at ON public.events USING btree (app_end_at);
CREATE INDEX idx_events_custom_fields ON public.events USING gin (custom_fields);

-- Trigger
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: event_photos
-- Description: Photos associated with events
-- -----------------------------------------------------------------------------
CREATE TABLE public.event_photos (
    event_id integer NOT NULL,
    photo_id integer NOT NULL,
    display_order integer NOT NULL
);

ALTER TABLE public.event_photos OWNER TO dating_admin;

-- Primary key
ALTER TABLE ONLY public.event_photos ADD CONSTRAINT event_photos_pkey PRIMARY KEY (event_id, photo_id);

-- Foreign keys
ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_photo_id_fkey
    FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- Table: event_whitelist
-- Description: Phone-based whitelist for controlling event access
-- -----------------------------------------------------------------------------
CREATE TABLE public.event_whitelist (
    id integer NOT NULL,
    event_id integer NOT NULL,
    phone character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active' NOT NULL,
    source character varying(20) DEFAULT 'manual' NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    removed_at timestamp without time zone,
    CONSTRAINT event_whitelist_status_check CHECK (status IN ('active', 'removed')),
    CONSTRAINT event_whitelist_source_check CHECK (source IN ('manual', 'csv', 'xml'))
);

ALTER TABLE public.event_whitelist OWNER TO dating_admin;

CREATE SEQUENCE public.event_whitelist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.event_whitelist_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.event_whitelist_id_seq OWNED BY public.event_whitelist.id;
ALTER TABLE ONLY public.event_whitelist ALTER COLUMN id SET DEFAULT nextval('public.event_whitelist_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.event_whitelist ADD CONSTRAINT event_whitelist_pkey PRIMARY KEY (id);

-- Unique constraint (one phone per event)
ALTER TABLE ONLY public.event_whitelist ADD CONSTRAINT event_whitelist_event_phone_unique UNIQUE (event_id, phone);

-- Foreign keys
ALTER TABLE ONLY public.event_whitelist
    ADD CONSTRAINT event_whitelist_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_whitelist
    ADD CONSTRAINT event_whitelist_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_event_whitelist_phone ON public.event_whitelist USING btree (phone);
CREATE INDEX idx_event_whitelist_event_status ON public.event_whitelist USING btree (event_id, status);
CREATE INDEX idx_event_whitelist_user_id ON public.event_whitelist USING btree (user_id);

-- Trigger
CREATE TRIGGER update_event_whitelist_updated_at
    BEFORE UPDATE ON public.event_whitelist
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: event_link_access
-- Description: Access tokens for event invitation links
-- -----------------------------------------------------------------------------
CREATE TABLE public.event_link_access (
    id integer NOT NULL,
    event_id integer NOT NULL,
    access_token text NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.event_link_access OWNER TO dating_admin;

CREATE SEQUENCE public.event_link_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.event_link_access_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.event_link_access_id_seq OWNED BY public.event_link_access.id;
ALTER TABLE ONLY public.event_link_access ALTER COLUMN id SET DEFAULT nextval('public.event_link_access_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.event_link_access ADD CONSTRAINT event_link_access_pkey PRIMARY KEY (id);

-- Unique constraint
ALTER TABLE ONLY public.event_link_access ADD CONSTRAINT event_link_access_access_token_key UNIQUE (access_token);

-- Foreign key
ALTER TABLE ONLY public.event_link_access
    ADD CONSTRAINT event_link_access_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- Table: event_blocked_users
-- Description: Users who have been removed/blocked from events and cannot re-register
-- -----------------------------------------------------------------------------
CREATE TABLE public.event_blocked_users (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    blocked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reason character varying(255)
);

ALTER TABLE public.event_blocked_users OWNER TO dating_admin;

CREATE SEQUENCE public.event_blocked_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.event_blocked_users_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.event_blocked_users_id_seq OWNED BY public.event_blocked_users.id;
ALTER TABLE ONLY public.event_blocked_users ALTER COLUMN id SET DEFAULT nextval('public.event_blocked_users_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.event_blocked_users ADD CONSTRAINT event_blocked_users_pkey PRIMARY KEY (id);

-- Unique constraint (one entry per user per event)
ALTER TABLE ONLY public.event_blocked_users ADD CONSTRAINT event_blocked_users_event_user_unique UNIQUE (event_id, user_id);

-- Foreign keys
ALTER TABLE ONLY public.event_blocked_users
    ADD CONSTRAINT event_blocked_users_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_blocked_users
    ADD CONSTRAINT event_blocked_users_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Index
CREATE INDEX idx_event_blocked_users_event ON public.event_blocked_users USING btree (event_id);
CREATE INDEX idx_event_blocked_users_user ON public.event_blocked_users USING btree (user_id);


-- ============================================================
-- Source: 04-matching.sql
-- ============================================================

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


-- ============================================================
-- Source: 05-auth.sql
-- ============================================================

--
-- Authentication tables
--

-- -----------------------------------------------------------------------------
-- Table: refresh_tokens
-- Description: JWT refresh tokens for users and organizations
-- -----------------------------------------------------------------------------
CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer,
    orga_id integer,
    user_type character varying(10),
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL,
    CONSTRAINT check_single_id CHECK (
        ((user_id IS NOT NULL) AND (orga_id IS NULL) AND ((user_type)::text = 'user'::text))
        OR
        ((orga_id IS NOT NULL) AND (user_id IS NULL) AND ((user_type)::text = 'orga'::text))
    ),
    CONSTRAINT refresh_tokens_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['user'::character varying, 'orga'::character varying])::text[])))
);

ALTER TABLE public.refresh_tokens OWNER TO dating_admin;

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;
ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.refresh_tokens ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_orga_id_fkey
    FOREIGN KEY (orga_id) REFERENCES public.orga(id) ON DELETE CASCADE;

-- Function: clean expired tokens on each new insert
CREATE FUNCTION public.clean_expired_tokens() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.refresh_tokens WHERE expiry <= NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.clean_expired_tokens() OWNER TO dating_admin;

CREATE TRIGGER trg_clean_expired_tokens
    BEFORE INSERT ON public.refresh_tokens
    FOR EACH ROW EXECUTE FUNCTION public.clean_expired_tokens();


-- ============================================================
-- Source: 06-user-events.sql
-- ============================================================

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


-- ============================================================
-- Source: 07-likes.sql
-- ============================================================

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


-- ============================================================
-- Source: 08-photos-event.sql
-- ============================================================

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


-- ============================================================
-- Source: 09-reports.sql
-- ============================================================

--
-- Reports/Signalements tables
--

-- -----------------------------------------------------------------------------
-- Table: reports
-- Description: User reports for moderation
-- Types: 'photo' (offensive image), 'profile' (offensive profile info), 'message' (offensive message)
-- -----------------------------------------------------------------------------
CREATE TABLE public.reports (
    id integer NOT NULL,
    event_id integer NOT NULL,
    reporter_id integer NOT NULL,
    reported_user_id integer NOT NULL,
    match_id integer,
    report_type varchar(20) NOT NULL CHECK (report_type IN ('photo', 'profile', 'message')),
    reason varchar(50) NOT NULL,
    description text,
    status varchar(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    orga_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    resolved_at timestamp without time zone
);

ALTER TABLE public.reports OWNER TO dating_admin;

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reports_id_seq OWNER TO dating_admin;
ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;
ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);

-- Primary key
ALTER TABLE ONLY public.reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

-- Foreign keys
ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey
    FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_match_id_fkey
    FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_reports_event ON public.reports USING btree (event_id);
CREATE INDEX idx_reports_status ON public.reports USING btree (status);
CREATE INDEX idx_reports_reported_user ON public.reports USING btree (reported_user_id);
CREATE INDEX idx_reports_created ON public.reports USING btree (created_at DESC);


-- ============================================================
-- Source: 10-orga-logo-event-banner.sql
-- ============================================================

-- Add logo_path to orga table (organizer logo)
ALTER TABLE public.orga ADD COLUMN IF NOT EXISTS logo_path character varying(255);

-- Add banner_path to events table (custom event banner)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS banner_path character varying(255);


