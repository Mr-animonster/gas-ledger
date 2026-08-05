CREATE TABLE public.stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_date date NOT NULL,
  package_code_id uuid NOT NULL REFERENCES public.package_codes(id) ON DELETE RESTRICT,
  opening_good_filled integer NOT NULL DEFAULT 0,
  opening_good_empty integer NOT NULL DEFAULT 0,
  opening_defective_filled integer NOT NULL DEFAULT 0,
  opening_defective_empty integer NOT NULL DEFAULT 0,
  received_from_plant integer NOT NULL DEFAULT 0,
  refill_sale integer NOT NULL DEFAULT 0,
  sv_new_issues integer NOT NULL DEFAULT 0,
  sv_reconnection_issues integer NOT NULL DEFAULT 0,
  sv_additional_issues integer NOT NULL DEFAULT 0,
  received_from_consumer_refill integer NOT NULL DEFAULT 0,
  received_from_consumer_against_tv integer NOT NULL DEFAULT 0,
  returned_to_plant integer NOT NULL DEFAULT 0,
  defective_item_returned_to_plant integer NOT NULL DEFAULT 0,
  newly_identified_defective integer NOT NULL DEFAULT 0,
  closing_good_filled integer NOT NULL DEFAULT 0,
  closing_good_empty integer NOT NULL DEFAULT 0,
  closing_defective_filled integer NOT NULL DEFAULT 0,
  closing_defective_empty integer NOT NULL DEFAULT 0,
  filled_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_date, package_code_id)
);

GRANT ALL ON public.stock_entries TO service_role;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX stock_entries_date_idx ON public.stock_entries (stock_date);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_stock_entries_updated_at
BEFORE UPDATE ON public.stock_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();