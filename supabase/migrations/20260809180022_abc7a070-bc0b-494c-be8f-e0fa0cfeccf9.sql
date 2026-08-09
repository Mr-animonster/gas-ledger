CREATE TYPE public.defect_source AS ENUM ('Truck', 'Consumer');
CREATE TYPE public.defect_seal_condition AS ENUM ('OK', 'Damaged', 'N/A');

CREATE SEQUENCE IF NOT EXISTS public.defective_sr_seq START 1;

CREATE TABLE public.defective_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no bigint NOT NULL DEFAULT nextval('public.defective_sr_seq'),
  date_of_identification date NOT NULL DEFAULT CURRENT_DATE,
  cylinder_dpr_type_id uuid REFERENCES public.package_codes(id),
  cylinder_dpr_sr_no text,
  batch_no text,
  seal_condition public.defect_seal_condition NOT NULL DEFAULT 'N/A',
  nature_of_defect text,
  source public.defect_source NOT NULL DEFAULT 'Consumer',
  tt_no text,
  consumer_id uuid REFERENCES public.consumers(id),
  consumer_no text,
  consumer_name text,
  consumer_contact text,
  prcn text,
  prcn_sent_on date,
  prcn_received boolean NOT NULL DEFAULT false,
  driver_consumer_signature text,
  plant_name text,
  sent_to_plant_on date,
  received_replacement_stock_on date,
  distributor_signature text,
  filled_by uuid REFERENCES public.staff(id),
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.defective_entries TO service_role;

ALTER TABLE public.defective_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_defective_entries_updated_at
BEFORE UPDATE ON public.defective_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();