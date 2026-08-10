-- ============ ENUMS ============
CREATE TYPE public.complaint_nature AS ENUM ('Delay', 'Leakage', 'Behaviour', 'Other');
CREATE TYPE public.inspection_type AS ENUM ('Routine', 'Surprise', 'Investigation');
CREATE TYPE public.irregularity_category AS ENUM ('Critical', 'Major', 'Minor', 'None');

-- ============ COMPLAINT REGISTER ============
CREATE SEQUENCE IF NOT EXISTS public.complaint_sr_seq;

CREATE TABLE public.complaint_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no bigint NOT NULL DEFAULT nextval('public.complaint_sr_seq'),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  consumer_id uuid REFERENCES public.consumers(id),
  consumer_no text,
  consumer_name text,
  consumer_contact text,
  complaint_text text NOT NULL DEFAULT '',
  nature public.complaint_nature NOT NULL DEFAULT 'Other',
  action_taken text,
  resolved_date date,
  resolved_by uuid REFERENCES public.staff(id),
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_entries TO service_role;
ALTER TABLE public.complaint_entries ENABLE ROW LEVEL SECURITY;
-- No policies: the Data API (anon/authenticated) can never reach this table.
-- All access goes through trusted server code.

CREATE TRIGGER update_complaint_entries_updated_at
  BEFORE UPDATE ON public.complaint_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WAGE REGISTER (DISTRIBUTOR ONLY) ============
CREATE TABLE public.wage_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  staff_id uuid REFERENCES public.staff(id),
  staff_name text,
  role public.staff_role,
  days_worked integer NOT NULL DEFAULT 0,
  gross_wage numeric NOT NULL DEFAULT 0,
  pf_applicable numeric NOT NULL DEFAULT 0,
  esi_applicable numeric NOT NULL DEFAULT 0,
  net_paid numeric NOT NULL DEFAULT 0,
  net_paid_override boolean NOT NULL DEFAULT false,
  payment_mode text,
  payment_date date,
  remarks text,
  proprietor_signature text,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_year, staff_id)
);

ALTER TABLE public.wage_entries ENABLE ROW LEVEL SECURITY;
-- No policies AND no table grants to any role, including service_role.
-- Even trusted server code cannot touch this table directly; it must go
-- through the distributor-gated functions below.
REVOKE ALL ON public.wage_entries FROM anon, authenticated, service_role;

CREATE TRIGGER update_wage_entries_updated_at
  BEFORE UPDATE ON public.wage_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INSPECTION LOG (DISTRIBUTOR ONLY) ============
CREATE TABLE public.inspection_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  officer_name_designation text,
  type public.inspection_type NOT NULL DEFAULT 'Routine',
  irregularity_category public.irregularity_category NOT NULL DEFAULT 'None',
  scn_date date,
  reply_date date,
  speaking_order_date date,
  fine_amount numeric NOT NULL DEFAULT 0,
  report_filed boolean NOT NULL DEFAULT false,
  report_file_ref text,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inspection_entries FROM anon, authenticated, service_role;

CREATE TRIGGER update_inspection_entries_updated_at
  BEFORE UPDATE ON public.inspection_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DISTRIBUTOR-GATED ACCESS FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.assert_distributor(p_role text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_role IS DISTINCT FROM 'distributor' THEN
    RAISE EXCEPTION 'Access denied: this register is restricted to the distributor.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Wage register
CREATE OR REPLACE FUNCTION public.wage_entries_list(p_role text, p_month text DEFAULT NULL)
RETURNS SETOF public.wage_entries
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_distributor(p_role);
  RETURN QUERY
    SELECT * FROM public.wage_entries
    WHERE p_month IS NULL OR month_year = p_month
    ORDER BY month_year DESC, staff_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.wage_entries_save(p_role text, p_id uuid, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_locked boolean;
BEGIN
  PERFORM public.assert_distributor(p_role);

  IF p_id IS NOT NULL THEN
    SELECT locked INTO v_locked FROM public.wage_entries WHERE id = p_id;
    IF v_locked THEN
      RAISE EXCEPTION 'This wage entry is locked. Request an edit to make changes.';
    END IF;
  END IF;

  INSERT INTO public.wage_entries AS w (
    id, month_year, staff_id, staff_name, role, days_worked, gross_wage,
    pf_applicable, esi_applicable, net_paid, net_paid_override,
    payment_mode, payment_date, remarks, proprietor_signature, locked, locked_at
  )
  SELECT
    COALESCE(p_id, gen_random_uuid()),
    p_payload->>'month_year',
    NULLIF(p_payload->>'staff_id', '')::uuid,
    p_payload->>'staff_name',
    NULLIF(p_payload->>'role', '')::public.staff_role,
    COALESCE((p_payload->>'days_worked')::int, 0),
    COALESCE((p_payload->>'gross_wage')::numeric, 0),
    COALESCE((p_payload->>'pf_applicable')::numeric, 0),
    COALESCE((p_payload->>'esi_applicable')::numeric, 0),
    COALESCE((p_payload->>'net_paid')::numeric, 0),
    COALESCE((p_payload->>'net_paid_override')::boolean, false),
    p_payload->>'payment_mode',
    NULLIF(p_payload->>'payment_date', '')::date,
    p_payload->>'remarks',
    p_payload->>'proprietor_signature',
    COALESCE((p_payload->>'locked')::boolean, false),
    CASE WHEN COALESCE((p_payload->>'locked')::boolean, false) THEN now() ELSE NULL END
  ON CONFLICT (id) DO UPDATE SET
    month_year = EXCLUDED.month_year,
    staff_id = EXCLUDED.staff_id,
    staff_name = EXCLUDED.staff_name,
    role = EXCLUDED.role,
    days_worked = EXCLUDED.days_worked,
    gross_wage = EXCLUDED.gross_wage,
    pf_applicable = EXCLUDED.pf_applicable,
    esi_applicable = EXCLUDED.esi_applicable,
    net_paid = EXCLUDED.net_paid,
    net_paid_override = EXCLUDED.net_paid_override,
    payment_mode = EXCLUDED.payment_mode,
    payment_date = EXCLUDED.payment_date,
    remarks = EXCLUDED.remarks,
    proprietor_signature = EXCLUDED.proprietor_signature,
    locked = EXCLUDED.locked,
    locked_at = EXCLUDED.locked_at
  RETURNING w.id INTO v_id;

  RETURN v_id;
END;
$$;

-- Inspection log
CREATE OR REPLACE FUNCTION public.inspection_entries_list(p_role text)
RETURNS SETOF public.inspection_entries
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_distributor(p_role);
  RETURN QUERY
    SELECT * FROM public.inspection_entries ORDER BY inspection_date DESC, created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.inspection_entries_save(p_role text, p_id uuid, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_locked boolean;
BEGIN
  PERFORM public.assert_distributor(p_role);

  IF p_id IS NOT NULL THEN
    SELECT locked INTO v_locked FROM public.inspection_entries WHERE id = p_id;
    IF v_locked THEN
      RAISE EXCEPTION 'This inspection entry is locked. Request an edit to make changes.';
    END IF;
  END IF;

  INSERT INTO public.inspection_entries AS i (
    id, inspection_date, officer_name_designation, type, irregularity_category,
    scn_date, reply_date, speaking_order_date, fine_amount, report_filed,
    report_file_ref, locked, locked_at
  )
  SELECT
    COALESCE(p_id, gen_random_uuid()),
    COALESCE(NULLIF(p_payload->>'inspection_date', '')::date, CURRENT_DATE),
    p_payload->>'officer_name_designation',
    COALESCE(NULLIF(p_payload->>'type', '')::public.inspection_type, 'Routine'),
    COALESCE(NULLIF(p_payload->>'irregularity_category', '')::public.irregularity_category, 'None'),
    NULLIF(p_payload->>'scn_date', '')::date,
    NULLIF(p_payload->>'reply_date', '')::date,
    NULLIF(p_payload->>'speaking_order_date', '')::date,
    COALESCE((p_payload->>'fine_amount')::numeric, 0),
    COALESCE((p_payload->>'report_filed')::boolean, false),
    p_payload->>'report_file_ref',
    COALESCE((p_payload->>'locked')::boolean, false),
    CASE WHEN COALESCE((p_payload->>'locked')::boolean, false) THEN now() ELSE NULL END
  ON CONFLICT (id) DO UPDATE SET
    inspection_date = EXCLUDED.inspection_date,
    officer_name_designation = EXCLUDED.officer_name_designation,
    type = EXCLUDED.type,
    irregularity_category = EXCLUDED.irregularity_category,
    scn_date = EXCLUDED.scn_date,
    reply_date = EXCLUDED.reply_date,
    speaking_order_date = EXCLUDED.speaking_order_date,
    fine_amount = EXCLUDED.fine_amount,
    report_filed = EXCLUDED.report_filed,
    report_file_ref = EXCLUDED.report_file_ref,
    locked = EXCLUDED.locked,
    locked_at = EXCLUDED.locked_at
  RETURNING i.id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.wage_entries_list(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wage_entries_save(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inspection_entries_list(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inspection_entries_save(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.wage_entries_list(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wage_entries_save(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.inspection_entries_list(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.inspection_entries_save(text, uuid, jsonb) TO service_role;