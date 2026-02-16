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
