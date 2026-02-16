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
