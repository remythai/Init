--
-- PostgreSQL database dump
--

\restrict hETxrcyO2BRAdrzdQzsEGbJfZmZDl3JwSA0fdUCRotT2e5iqyTc6JycwbLANzgc

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
    event_date timestamp without time zone,
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
-- Data for Name: event_link_access; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.event_link_access (id, event_id, access_token, used, created_at) FROM stdin;
\.


--
-- Data for Name: event_photos; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.event_photos (event_id, photo_id, display_order) FROM stdin;
\.


--
-- Data for Name: event_whitelist; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.event_whitelist (event_id) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.events (id, name, start_at, cooldown, end_at, orga_id, created_at, updated_at, max_participants, location, description, is_public, has_whitelist, has_link_access, has_password_access, access_password_hash, custom_fields, event_date) FROM stdin;
2	Tournoi d'Échecs Inter-Écoles	2025-12-01 09:00:00	02:00:00	2025-12-01 18:00:00	1	2025-11-07 14:16:17.702843	2025-11-07 14:16:17.702843	64	Salle Polyvalente, Paris	Tournoi amical d'échecs réunissant plusieurs écoles parisiennes.	t	f	t	f	\N	[{"id": "level", "type": "select", "label": "Niveau", "options": [{"label": "Débutant", "value": "beginner"}, {"label": "Intermédiaire", "value": "intermediate"}, {"label": "Avancé", "value": "advanced"}], "required": true}, {"id": "need_equipment", "type": "checkbox", "label": "Besoin de matériel", "required": false}]	\N
3	Tournoi d'Échecs Inter-Écoles 2	2025-12-01 09:00:00	02:00:00	2025-12-01 18:00:00	1	2025-11-07 14:17:02.649399	2025-11-07 14:17:02.649399	64	Salle Polyvalente, Paris	Tournoi amical d'échecs réunissant plusieurs écoles parisiennes.	f	f	t	f	\N	[{"id": "level", "type": "select", "label": "Niveau", "options": [{"label": "Débutant", "value": "beginner"}, {"label": "Intermédiaire", "value": "intermediate"}, {"label": "Avancé", "value": "advanced"}], "required": true}, {"id": "need_equipment", "type": "checkbox", "label": "Besoin de matériel", "required": false}]	\N
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.matches (id, user1_id, user2_id, event_id, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.messages (id, match_id, sender_id, content, sent_at, is_read, is_liked) FROM stdin;
\.


--
-- Data for Name: orga; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.orga (id, nom, mail, description, tel, created_at, updated_at, password_hash) FROM stdin;
1	M-Tech	mail@test.com	\N	\N	2025-11-07 13:20:45.259917	2025-11-07 13:20:45.259917	$2b$10$ZVXndtNUq67gmWpa6N3RMe92piFtUe1muRLu8MM01NElxgkwmhdM.
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.photos (id, user_id, file_path, created_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.refresh_tokens (id, user_id, token, expiry, orga_id, user_type) FROM stdin;
1	1	80713be000b171cd195cc45181ee3d84a1ad1899239a5cfe31fe8e3a4ede283a29d5b68f50921b0cfd79b0481fa8160083cc7fcb1382cf49d1407f15ba61d391	2025-10-30 14:27:26.999	\N	\N
2	4	7bbd8b8ede38aece1ca954cb12b9d5bf727e16142a19d3f805a0579f1235833af54ccdec0e84fd8d092c38ecfae001eff59eb403ab6c8d8e8f909a68b3c7f95f	2025-10-30 14:40:19.822	\N	\N
3	4	b3a67d24b1f288aebc6e98d211ee2a852b1080c186d54caec7df18b18cebfc69dcd200d12f6d52e7c949b530dbf960c0f902a74527ff799ff95c54ec4396f216	2025-10-30 19:54:47.745	\N	\N
4	4	9040677286758a3410f689c7f8ca4cf0abdfd3341856a3286626a1a49b5a36f43cc9b96b76210b7e52a7be7593260fa288f6412b2567db0ca45915c93a0e0d21	2025-10-30 19:55:47.19	\N	\N
5	4	0f82abad0f7b953a1ac01490ac8b6c0a85a3de23a2d06a2f1821beaec9dc951d171fddea35b9b0ea1ff37c831191db11caa5e4780efa54c350e8b707f564c5c7	2025-10-31 10:36:13.827	\N	\N
6	1	275c82bb2fc366901a4855ca7e2155098ef21891835bb4ead528e4d9f7c4abe83c121062e2875d28fd88d060906770d2d7315f046370142c22b1a545e84e454b	2025-11-14 13:35:20.423	\N	\N
7	1	9df8bf6c36026291406f58dda52898e576482ce35231b338f219aac35b16f464c3276b487670a00c456a8c1e672b31426f544bb4a37c3403a0f95b524f852724	2025-11-14 13:54:13.366	\N	\N
8	1	7d63ac37524dec77f28cd98b4ef512074145f6b3a0f42b4060d1af63820aa630fbf0a12d9386c3ce3993c3de4d4e7ce496917ee2a7681ec5e65f43077bb64f04	2025-11-14 14:14:53.116	\N	\N
9	1	eb109e87d2f9c0c02be03cb903c750c36324a93b105f429296496d9f3cd49347b80c5bf7200d6d42bf081eb77d8478e12e4c69bf64d68dab20bb5412d12294c3	2025-11-14 14:32:17.036	\N	\N
10	\N	5aae6027bf052683a5857867d9d93328ff4e0ca37aeebbdc9ac22ac473ad6f50ce3bc2b96b9cca963f57cc28b9f72d0665d05f66b7903872621f9cda8a3766c1	2025-11-26 17:50:38.95	1	orga
11	\N	e089ca88f06a2cf4a6f9d6c3227b53095c7ac2a47589c10360a25eff58900f04a306a67800143ec2efbad017c4c46a0bbe7cfa65c50464a2468aa2c3dd22df69	2025-11-26 18:15:42.611	1	orga
12	1	935f988c255aed3d89bbbd0b0e9de746e18a02e97442f4a536e94809e7df13d97ef9591f400b5dffea202772338dac72293ffe6deff2828c1a211261b9754960	2025-11-26 18:38:40.401	\N	user
13	\N	7aa123f68191f6278472e05f8196a9416fb44cd1589ae6db29a0c1fb9b0bd5597696ae38e90fa5fd630b515db3e7dce7e99824683f9ffbca63a5dc0bf0675414	2025-11-26 18:42:56.581	1	orga
14	1	f74cc59dd8027b00a5cfbee257b554769d6022f0396b32d0b0407381e488c041bb85912fa14bfd94e6b1166d032f3f301372115624df0235a8522566defc0125	2025-11-26 18:55:11.826	\N	user
15	1	81ee1fc67f92ec2513667033c9fde3913e24880c2e3659612502c377331c43db17af2b65e9fde624ca3bac60ead59c8bff2339bc2e752718db228695e0e0c062	2025-11-27 10:09:40.572	\N	user
16	\N	9f57c499df72bd32096cbcddb05b332cb89bdb89f93fb60ed1fb81b07c77877ee29918e860a14ec5e2f8ee1565e9d21c8ac265a260f404a1ff5aed6dccc2ecac	2025-11-27 10:12:30.202	1	orga
\.


--
-- Data for Name: user_event_rel; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.user_event_rel (user_id, event_id, profil_info, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dating_admin
--

COPY public.users (id, firstname, lastname, mail, tel, birthday, created_at, updated_at, password_hash) FROM stdin;
1	Alice	Dupont	alice@example.com	0601020304	1995-08-12	2025-10-23 11:55:53.300893	2025-10-23 11:55:53.300893	$2b$10$73We/ZAnQGlPCvOVyQITX.6wRnVkIWQ.uC5sRcl.5oV5PMaMDrqYS
4	Alice	Dupont	\N	0707070707	1995-08-12	2025-10-23 14:40:01.798929	2025-10-23 14:40:01.798929	$2b$10$.UuleOQFeuXt173p/W6Eh.qOWyCWpSgtBdDgaucsQjppPnX50gOJ6
7	Alice	Dupont	\N	0707070708	1995-08-12	2025-10-24 10:37:32.441027	2025-10-24 10:37:32.441027	$2b$10$l4RHvZpg3Q9e3dVg2Ze69OinIkPt.DpYCa.RDKgKmaUnUXuvBkV5i
8	Alice	Dupont	\N	0707070701	1995-08-01	2025-11-06 21:38:04.645514	2025-11-06 21:38:04.645514	$2b$10$f90PdFz01S6l149GdhXP2eaK0IcTTaRPp0NkJtzMa4i1j3hpVrvZq
\.


--
-- Name: event_link_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.event_link_access_id_seq', 1, false);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.events_id_seq', 3, true);


--
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.matches_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: orga_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.orga_id_seq', 6, true);


--
-- Name: photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.photos_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 16, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dating_admin
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


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

\unrestrict hETxrcyO2BRAdrzdQzsEGbJfZmZDl3JwSA0fdUCRotT2e5iqyTc6JycwbLANzgc

