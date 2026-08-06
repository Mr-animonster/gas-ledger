CREATE SEQUENCE IF NOT EXISTS public.installation_arb_sr_seq START 1;

CREATE TABLE public.installation_arb_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sr_no BIGINT NOT NULL DEFAULT nextval('public.installation_arb_sr_seq'),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  consumer_id UUID REFERENCES public.consumers(id),
  consumer_no TEXT,
  consumer_name TEXT,
  mobile_no TEXT,
  sv_date DATE,
  installation_date DATE,
  type_of_stove_sold TEXT,
  lighter BOOLEAN NOT NULL DEFAULT false,
  apron BOOLEAN NOT NULL DEFAULT false,
  trolley BOOLEAN NOT NULL DEFAULT false,
  other_arb TEXT,
  total_bill_amount NUMERIC NOT NULL DEFAULT 0,
  total_receipt_amount NUMERIC NOT NULL DEFAULT 0,
  customer_sign TEXT,
  distributor_sign TEXT,
  filled_by UUID REFERENCES public.staff(id),
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.installation_arb_entries TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.installation_arb_sr_seq TO service_role;

ALTER TABLE public.installation_arb_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_installation_arb_entry_date ON public.installation_arb_entries(entry_date DESC);

CREATE TRIGGER update_installation_arb_entries_updated_at
BEFORE UPDATE ON public.installation_arb_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();