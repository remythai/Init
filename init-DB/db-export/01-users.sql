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
ALTER TABLE ONLY public.users ADD CONSTRAINT unique_mail UNIQUE (mail);
ALTER TABLE ONLY public.users ADD CONSTRAINT unique_tel UNIQUE (tel);

-- Indexes
CREATE INDEX idx_user_mail ON public.users USING btree (mail);
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
