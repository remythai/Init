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
    start_at timestamp without time zone NOT NULL,
    end_at timestamp without time zone NOT NULL,
    event_date timestamp without time zone,
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
    CONSTRAINT chk_event_dates CHECK ((end_at > start_at))
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
-- Description: Whitelist for private events
-- NOTE: Currently only stores event_id - consider adding user_id for full functionality
-- -----------------------------------------------------------------------------
CREATE TABLE public.event_whitelist (
    event_id integer NOT NULL
);

ALTER TABLE public.event_whitelist OWNER TO dating_admin;

-- Foreign key
ALTER TABLE ONLY public.event_whitelist
    ADD CONSTRAINT event_whitelist_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

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
