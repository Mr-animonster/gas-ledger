CREATE TYPE public.connection_sv_type AS ENUM ('New', 'Reconnection', 'Additional', 'TV');
CREATE TYPE public.tv_retrieval_state AS ENUM ('Filled', 'Empty', 'N/A');

CREATE SEQUENCE IF NOT EXISTS public.connection_sv_sr_seq START 1;

CREATE TABLE public.connection_sv_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no bigint NOT NULL DEFAULT nextval('public.connection_sv_sr_seq'),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  type public.connection_sv_type NOT NULL DEFAULT 'New',
  consumer_id uuid REFERENCES public.consumers(id),
  consumer_no text,
  consumer_name text,
  scheme public.consumer_scheme NOT NULL DEFAULT 'Regular',
  aadhaar_last4 text,
  bank_ac_last4 text,
  eligibility_check_done boolean NOT NULL DEFAULT false,
  duplicate_household_check_done boolean NOT NULL DEFAULT false,
  cylinder_dpr_type_id uuid REFERENCES public.package_codes(id),
  cylinder_dpr_count integer NOT NULL DEFAULT 0,
  filled_empty_at_tv_retrieval public.tv_retrieval_state NOT NULL DEFAULT 'N/A',
  cash_memo_no bigint,
  processed_by uuid REFERENCES public.staff(id),
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aadhaar_last4_len CHECK (aadhaar_last4 IS NULL OR aadhaar_last4 ~ '^[0-9]{0,4}$'),
  CONSTRAINT bank_ac_last4_len CHECK (bank_ac_last4 IS NULL OR bank_ac_last4 ~ '^[0-9]{0,4}$')
);

GRANT ALL ON public.connection_sv_entries TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.connection_sv_sr_seq TO service_role;

ALTER TABLE public.connection_sv_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_connection_sv_entries_updated_at
BEFORE UPDATE ON public.connection_sv_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_connection_sv_entries_date ON public.connection_sv_entries (entry_date DESC);