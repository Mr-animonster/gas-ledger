CREATE TYPE public.sale_item AS ENUM ('Refill', 'ARB-Other');
CREATE TYPE public.payment_mode AS ENUM ('Cash', 'UPI', 'Card');

CREATE SEQUENCE public.cash_memo_seq START 1001;

CREATE TABLE public.sales_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  booklet_page_photo_ref text,
  issued_by uuid REFERENCES public.staff(id),
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.sales_batches(id) ON DELETE CASCADE,
  cash_memo_no bigint NOT NULL UNIQUE DEFAULT nextval('public.cash_memo_seq'),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  consumer_id uuid REFERENCES public.consumers(id),
  consumer_no text,
  consumer_name text,
  item public.sale_item NOT NULL DEFAULT 'Refill',
  quantity integer NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  amount_charged numeric NOT NULL DEFAULT 0,
  payment_mode public.payment_mode NOT NULL DEFAULT 'Cash',
  pdc_done boolean NOT NULL DEFAULT false,
  issued_by uuid REFERENCES public.staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_entries_batch_idx ON public.sales_entries(batch_id);
CREATE INDEX sales_entries_date_idx ON public.sales_entries(sale_date);
CREATE INDEX sales_batches_date_idx ON public.sales_batches(batch_date);

GRANT ALL ON public.sales_batches TO service_role;
GRANT ALL ON public.sales_entries TO service_role;
GRANT USAGE ON SEQUENCE public.cash_memo_seq TO service_role;

ALTER TABLE public.sales_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sales_batches_updated_at BEFORE UPDATE ON public.sales_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_entries_updated_at BEFORE UPDATE ON public.sales_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES
  ('standard_rate_refill', '1103.50'),
  ('standard_rate_arb_other', '250.00')
ON CONFLICT (key) DO NOTHING;