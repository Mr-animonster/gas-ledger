ALTER TABLE public.edit_requests
  ADD COLUMN covered_table text,
  ADD COLUMN covered_ids uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.log_entry_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.edit_requests%ROWTYPE;
  v_direct boolean := false;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_key text;
BEGIN
  SELECT * INTO v_req
  FROM public.edit_requests
  WHERE status = 'approved'
    AND resolved_at IS NULL
    AND (
      (table_name = TG_TABLE_NAME AND entry_id = OLD.id)
      OR (covered_table = TG_TABLE_NAME AND OLD.id = ANY (covered_ids))
    )
  ORDER BY requested_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_direct := (v_req.table_name = TG_TABLE_NAME AND v_req.entry_id = OLD.id);

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

  IF v_direct AND v_req.covered_ids = '{}'::uuid[] THEN
    UPDATE public.edit_requests SET resolved_at = now() WHERE id = v_req.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER log_edit_sales_batches BEFORE UPDATE ON public.sales_batches
FOR EACH ROW EXECUTE FUNCTION public.log_entry_edit();