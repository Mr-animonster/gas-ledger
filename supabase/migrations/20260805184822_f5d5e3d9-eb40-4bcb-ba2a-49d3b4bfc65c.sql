CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES ('sqc_tolerance_grams', '10');

CREATE TYPE public.sealing_condition AS ENUM ('OK', 'Damaged');
CREATE TYPE public.leaky_location AS ENUM ('None', 'Body', 'Bung');

CREATE TABLE public.sqc_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  invoice_date date,
  transporter text,
  truck_no text,
  coming_from text,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  total_cylinders integer NOT NULL DEFAULT 0,
  godown_keeper_signature text,
  proprietor_partner_signature text,
  filled_by uuid REFERENCES public.staff(id),
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sqc_entries TO service_role;
ALTER TABLE public.sqc_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sqc_entries_updated_at BEFORE UPDATE ON public.sqc_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sqc_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sqc_entry_id uuid NOT NULL REFERENCES public.sqc_entries(id) ON DELETE CASCADE,
  s_no integer NOT NULL,
  cylinder_type_id uuid REFERENCES public.package_codes(id),
  tare_weight numeric(10,3) NOT NULL DEFAULT 0,
  gross_weight numeric(10,3) NOT NULL DEFAULT 0,
  observed_weight numeric(10,3) NOT NULL DEFAULT 0,
  variation numeric(10,3) NOT NULL DEFAULT 0,
  dpt_date date,
  sealing_condition public.sealing_condition NOT NULL DEFAULT 'OK',
  leaky_body_bung public.leaky_location NOT NULL DEFAULT 'None',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sqc_entry_id, s_no)
);
GRANT ALL ON public.sqc_line_items TO service_role;
ALTER TABLE public.sqc_line_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sqc_line_items_updated_at BEFORE UPDATE ON public.sqc_line_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sqc_line_items_entry ON public.sqc_line_items(sqc_entry_id);
CREATE INDEX idx_sqc_entries_received_date ON public.sqc_entries(received_date DESC);