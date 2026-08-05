CREATE TYPE public.consumer_scheme AS ENUM ('Regular', 'PMUY', 'Extended PMUY', 'PMUY-2');

CREATE TABLE public.package_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.package_codes TO service_role;
ALTER TABLE public.package_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.consumers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_no text NOT NULL UNIQUE,
  name text NOT NULL,
  mobile_no text,
  address text,
  scheme public.consumer_scheme NOT NULL DEFAULT 'Regular',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.consumers TO service_role;
ALTER TABLE public.consumers ENABLE ROW LEVEL SECURITY;

CREATE INDEX consumers_consumer_no_idx ON public.consumers (consumer_no text_pattern_ops);
CREATE INDEX consumers_name_idx ON public.consumers (lower(name) text_pattern_ops);

INSERT INTO public.package_codes (code, sort_order) VALUES
  ('14 Kg', 1),
  ('19 Kg', 2),
  ('5 KG Red', 3),
  ('5 KG Blue', 4),
  ('2 KG', 5),
  ('35 KG', 6),
  ('47.5 KG', 7),
  ('DPR', 8);

INSERT INTO public.consumers (consumer_no, name, mobile_no, address, scheme) VALUES
  ('1000123456', 'Ramesh Kumar', '9876543210', '12 Station Road, Ward 4', 'Regular'),
  ('1000234567', 'Sunita Devi', '9812345678', 'House 78, Gandhi Nagar', 'PMUY'),
  ('1000345678', 'Abdul Rahman', '9800011122', 'Shop 3, Main Bazaar', 'Regular'),
  ('1000456789', 'Lakshmi Narayan', '9733344455', 'Plot 21, Indira Colony', 'PMUY-2'),
  ('1000567890', 'Priya Sharma', '9911122233', 'Flat 5B, Green Apartments', 'Extended PMUY');