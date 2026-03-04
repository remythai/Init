DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'display_order_non_negative'
  ) THEN
    ALTER TABLE public.photos ADD CONSTRAINT display_order_non_negative CHECK (display_order >= 0);
  END IF;
END $$;
