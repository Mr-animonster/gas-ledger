CREATE TYPE public.edit_request_status AS ENUM ('pending', 'approved', 'expired');

CREATE TABLE public.edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  entry_id uuid NOT NULL,
  requested_by uuid REFERENCES public.staff(id),
  otp_hash text NOT NULL,
  otp_preview text,
  otp_sent_to text,
  status public.edit_request_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.edit_requests TO service_role;
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_edit_requests_entry ON public.edit_requests (table_name, entry_id);
CREATE INDEX idx_edit_requests_status ON public.edit_requests (status, requested_at DESC);

CREATE TRIGGER update_edit_requests_updated_at BEFORE UPDATE ON public.edit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.entry_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  entry_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  edited_by uuid REFERENCES public.staff(id),
  edited_at timestamptz NOT NULL DEFAULT now(),
  edit_request_id uuid REFERENCES public.edit_requests(id)
);

GRANT ALL ON public.entry_edit_history TO service_role;
ALTER TABLE public.entry_edit_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_entry_edit_history_entry ON public.entry_edit_history (table_name, entry_id, edited_at DESC);

-- Diff + re-lock trigger: runs only when an approved, unresolved edit request exists for the row.
CREATE OR REPLACE FUNCTION public.log_entry_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.edit_requests%ROWTYPE;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_key text;
BEGIN
  SELECT * INTO v_req
  FROM public.edit_requests
  WHERE table_name = TG_TABLE_NAME
    AND entry_id = OLD.id
    AND status = 'approved'
    AND resolved_at IS NULL
  ORDER BY requested_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
    IF v_key NOT IN ('updated_at', 'locked', 'locked_at', 'created_at')
       AND COALESCE(v_old ->> v_key, '') IS DISTINCT FROM COALESCE(v_new ->> v_key, '') THEN
      INSERT INTO public.entry_edit_history
        (table_name, entry_id, field_name, old_value, new_value, edited_by, edit_request_id)
      VALUES
        (TG_TABLE_NAME, OLD.id, v_key, v_old ->> v_key, v_new ->> v_key, v_req.requested_by, v_req.id);
    END IF;
  END LOOP;

  NEW.locked := true;
  NEW.locked_at := now();

  UPDATE public.edit_requests SET resolved_at = now() WHERE id = v_req.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER log_edit_stock_entries BEFORE UPDATE ON public.stock_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();
CREATE TRIGGER log_edit_sqc_entries BEFORE UPDATE ON public.sqc_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();
CREATE TRIGGER log_edit_sales_entries BEFORE UPDATE ON public.sales_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();
CREATE TRIGGER log_edit_installation_arb_entries BEFORE UPDATE ON public.installation_arb_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();
CREATE TRIGGER log_edit_connection_sv_entries BEFORE UPDATE ON public.connection_sv_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();
CREATE TRIGGER log_edit_defective_entries BEFORE UPDATE ON public.defective_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();
CREATE TRIGGER log_edit_complaint_entries BEFORE UPDATE ON public.complaint_entries FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();

-- Nightly lock of the day's entries
CREATE OR REPLACE FUNCTION public.lock_todays_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  UPDATE public.stock_entries SET locked = true, locked_at = now()
    WHERE stock_date = v_today AND locked = false;
  UPDATE public.sqc_entries SET locked = true, locked_at = now()
    WHERE received_date = v_today AND locked = false;
  UPDATE public.sales_batches SET locked = true, locked_at = now()
    WHERE batch_date = v_today AND locked = false;
  UPDATE public.installation_arb_entries SET locked = true, locked_at = now()
    WHERE entry_date = v_today AND locked = false;
  UPDATE public.connection_sv_entries SET locked = true, locked_at = now()
    WHERE entry_date = v_today AND locked = false;
  UPDATE public.defective_entries SET locked = true, locked_at = now()
    WHERE date_of_identification = v_today AND locked = false;
  UPDATE public.complaint_entries SET locked = true, locked_at = now()
    WHERE entry_date = v_today AND locked = false;

  UPDATE public.edit_requests SET status = 'expired', resolved_at = now()
    WHERE status = 'pending' AND expires_at < now() AND resolved_at IS NULL;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'lock-registers-9pm-ist',
  '30 15 * * *',
  $$SELECT public.lock_todays_entries();$$
);