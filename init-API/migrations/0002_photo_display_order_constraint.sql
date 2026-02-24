ALTER TABLE public.photos ADD CONSTRAINT display_order_non_negative CHECK (display_order >= 0);
