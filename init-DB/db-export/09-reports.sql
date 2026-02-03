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
