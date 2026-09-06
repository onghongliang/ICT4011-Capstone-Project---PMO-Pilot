-- Shared trigger function: keeps `updated_at` current on every UPDATE.
-- Attached per-table by later migrations wherever `updated_at` exists.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
