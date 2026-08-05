CREATE TYPE public.staff_role AS ENUM ('godown', 'computer_staff', 'distributor');

CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role public.staff_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.distributor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL DEFAULT 'LPG Agency',
  agency_id text NOT NULL,
  password text NOT NULL,
  phone_number text NOT NULL,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.distributor_settings TO service_role;
ALTER TABLE public.distributor_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.distributor_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  phone_number text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.distributor_otps TO service_role;
ALTER TABLE public.distributor_otps ENABLE ROW LEVEL SECURITY;

INSERT INTO public.distributor_settings (agency_name, agency_id, password, phone_number)
VALUES ('Sri Balaji Gas Agency', 'agency', 'lpg1234', '+919000000000');

INSERT INTO public.staff (name, role) VALUES
  ('Ramesh Kumar', 'godown'),
  ('Suresh Patil', 'godown'),
  ('Anita Sharma', 'computer_staff'),
  ('M. Venkatesh', 'distributor');