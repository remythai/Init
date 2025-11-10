--
-- PostgreSQL database dump
--

\restrict dAhtawKcK2GzJyLPPNoBpErvZmX2KUvbO9ZVerIjsACMQr6uqqUqLaybEjDgK8a

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: dating_admin
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO dating_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: event_link_access; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.event_link_access (
    id integer NOT NULL,
    event_id integer NOT NULL,
    access_token text NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_link_access OWNER TO dating_admin;

--
-- Name: event_link_access_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.event_link_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_link_access_id_seq OWNER TO dating_admin;

--
-- Name: event_link_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.event_link_access_id_seq OWNED BY public.event_link_access.id;


--
-- Name: event_photos; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.event_photos (
    event_id integer NOT NULL,
    photo_id integer NOT NULL,
    display_order integer NOT NULL
);


ALTER TABLE public.event_photos OWNER TO dating_admin;

--
-- Name: event_whitelist; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.event_whitelist (
    event_id integer NOT NULL
);


ALTER TABLE public.event_whitelist OWNER TO dating_admin;

--
-- Name: events; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.events (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    start_at timestamp without time zone NOT NULL,
    cooldown interval,
    end_at timestamp without time zone NOT NULL,
    orga_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    max_participants integer,
    location text,
    description text DEFAULT ' '::text NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    has_whitelist boolean DEFAULT false NOT NULL,
    has_link_access boolean DEFAULT false NOT NULL,
    has_password_access boolean DEFAULT false NOT NULL,
    access_password_hash text,
    custom_fields jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT chk_event_dates CHECK ((end_at > start_at))
);


ALTER TABLE public.events OWNER TO dating_admin;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO dating_admin;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    user1_id integer NOT NULL,
    user2_id integer NOT NULL,
    event_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.matches OWNER TO dating_admin;

--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO dating_admin;

--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: dating_admin
--

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

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO dating_admin;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: orga; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.orga (
    id integer NOT NULL,
    nom character varying(255) NOT NULL,
    mail character varying(255) NOT NULL,
    description text,
    tel character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password_hash character varying(255) NOT NULL
);


ALTER TABLE public.orga OWNER TO dating_admin;

--
-- Name: orga_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.orga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orga_id_seq OWNER TO dating_admin;

--
-- Name: orga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.orga_id_seq OWNED BY public.orga.id;


--
-- Name: photos; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.photos (
    id integer NOT NULL,
    user_id integer NOT NULL,
    file_path text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.photos OWNER TO dating_admin;

--
-- Name: photos_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.photos_id_seq OWNER TO dating_admin;

--
-- Name: photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.photos_id_seq OWNED BY public.photos.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL,
    orga_id integer,
    user_type character varying(10),
    CONSTRAINT check_single_id CHECK ((((user_id IS NOT NULL) AND (orga_id IS NULL) AND ((user_type)::text = 'user'::text)) OR ((orga_id IS NOT NULL) AND (user_id IS NULL) AND ((user_type)::text = 'orga'::text)))),
    CONSTRAINT refresh_tokens_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['user'::character varying, 'orga'::character varying])::text[])))
);


ALTER TABLE public.refresh_tokens OWNER TO dating_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO dating_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: user_event_rel; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.user_event_rel (
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    profil_info jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_event_rel OWNER TO dating_admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: dating_admin
--

CREATE TABLE public.users (
    id integer NOT NULL,
    firstname character varying(100) NOT NULL,
    lastname character varying(100) NOT NULL,
    mail character varying(255),
    tel character varying(20) NOT NULL,
    birthday date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password_hash character varying(255) NOT NULL
);


ALTER TABLE public.users OWNER TO dating_admin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: dating_admin
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO dating_admin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dating_admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: event_link_access id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_link_access ALTER COLUMN id SET DEFAULT nextval('public.event_link_access_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: orga id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.orga ALTER COLUMN id SET DEFAULT nextval('public.orga_id_seq'::regclass);


--
-- Name: photos id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.photos ALTER COLUMN id SET DEFAULT nextval('public.photos_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: event_link_access event_link_access_access_token_key; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_link_access
    ADD CONSTRAINT event_link_access_access_token_key UNIQUE (access_token);


--
-- Name: event_link_access event_link_access_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_link_access
    ADD CONSTRAINT event_link_access_pkey PRIMARY KEY (id);


--
-- Name: event_photos event_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_pkey PRIMARY KEY (event_id, photo_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: orga orga_mail_key; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.orga
    ADD CONSTRAINT orga_mail_key UNIQUE (mail);


--
-- Name: orga orga_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.orga
    ADD CONSTRAINT orga_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: users unique_mail; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_mail UNIQUE (mail);


--
-- Name: users unique_tel; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_tel UNIQUE (tel);


--
-- Name: user_event_rel user_event_rel_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.user_event_rel
    ADD CONSTRAINT user_event_rel_pkey PRIMARY KEY (user_id, event_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_events_custom_fields; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_events_custom_fields ON public.events USING gin (custom_fields);


--
-- Name: idx_events_orga_id; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_events_orga_id ON public.events USING btree (orga_id);


--
-- Name: idx_events_start_at; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_events_start_at ON public.events USING btree (start_at);


--
-- Name: idx_orga_mail; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_orga_mail ON public.orga USING btree (mail);


--
-- Name: idx_user_birthday; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_user_birthday ON public.users USING btree (birthday);


--
-- Name: idx_user_event_rel_profil_info; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_user_event_rel_profil_info ON public.user_event_rel USING gin (profil_info);


--
-- Name: idx_user_mail; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_user_mail ON public.users USING btree (mail);


--
-- Name: idx_user_tel; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE INDEX idx_user_tel ON public.users USING btree (tel);


--
-- Name: unique_match_pair; Type: INDEX; Schema: public; Owner: dating_admin
--

CREATE UNIQUE INDEX unique_match_pair ON public.matches USING btree (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: dating_admin
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orga update_orga_updated_at; Type: TRIGGER; Schema: public; Owner: dating_admin
--

CREATE TRIGGER update_orga_updated_at BEFORE UPDATE ON public.orga FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_event_rel update_user_event_rel_updated_at; Type: TRIGGER; Schema: public; Owner: dating_admin
--

CREATE TRIGGER update_user_event_rel_updated_at BEFORE UPDATE ON public.user_event_rel FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: dating_admin
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_link_access event_link_access_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_link_access
    ADD CONSTRAINT event_link_access_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_photos event_photos_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_photos event_photos_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_photos
    ADD CONSTRAINT event_photos_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;


--
-- Name: event_whitelist event_whitelist_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.event_whitelist
    ADD CONSTRAINT event_whitelist_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_orga_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_orga_id_fkey FOREIGN KEY (orga_id) REFERENCES public.orga(id) ON DELETE CASCADE;


--
-- Name: matches matches_first_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_first_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: matches matches_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id);


--
-- Name: matches matches_user2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id);


--
-- Name: messages messages_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: photos photos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_orga_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_orga_id_fkey FOREIGN KEY (orga_id) REFERENCES public.orga(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_event_rel user_event_rel_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.user_event_rel
    ADD CONSTRAINT user_event_rel_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: user_event_rel user_event_rel_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dating_admin
--

ALTER TABLE ONLY public.user_event_rel
    ADD CONSTRAINT user_event_rel_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dAhtawKcK2GzJyLPPNoBpErvZmX2KUvbO9ZVerIjsACMQr6uqqUqLaybEjDgK8a

