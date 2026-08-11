ALTER TABLE public.sales_entries
  ADD COLUMN IF NOT EXISTS package_code_id uuid REFERENCES public.package_codes(id);

UPDATE public.sales_entries
SET package_code_id = (SELECT id FROM public.package_codes WHERE code = '14 Kg' LIMIT 1)
WHERE package_code_id IS NULL;

CREATE INDEX IF NOT EXISTS sales_entries_date_pkg_idx
  ON public.sales_entries (sale_date, package_code_id);

CREATE OR REPLACE VIEW public.v_daily_refill_sale
WITH (security_invoker = true) AS
SELECT s.sale_date AS entry_date,
       s.package_code_id,
       SUM(s.quantity)::bigint AS refill_sale
FROM public.sales_entries s
WHERE s.item = 'Refill' AND s.package_code_id IS NOT NULL
GROUP BY s.sale_date, s.package_code_id;

CREATE OR REPLACE VIEW public.v_daily_sv_issues
WITH (security_invoker = true) AS
SELECT c.entry_date,
       c.cylinder_dpr_type_id AS package_code_id,
       COALESCE(SUM(c.cylinder_dpr_count) FILTER (WHERE c.type = 'New'), 0)::bigint AS sv_new_issues,
       COALESCE(SUM(c.cylinder_dpr_count) FILTER (WHERE c.type = 'Reconnection'), 0)::bigint AS sv_reconnection_issues,
       COALESCE(SUM(c.cylinder_dpr_count) FILTER (WHERE c.type = 'Additional'), 0)::bigint AS sv_additional_issues
FROM public.connection_sv_entries c
WHERE c.cylinder_dpr_type_id IS NOT NULL AND c.type <> 'TV'
GROUP BY c.entry_date, c.cylinder_dpr_type_id;

CREATE OR REPLACE VIEW public.v_daily_tv_retrieval
WITH (security_invoker = true) AS
SELECT c.entry_date,
       c.cylinder_dpr_type_id AS package_code_id,
       COALESCE(SUM(c.cylinder_dpr_count) FILTER (WHERE c.filled_empty_at_tv_retrieval = 'Filled'), 0)::bigint AS tv_filled,
       COALESCE(SUM(c.cylinder_dpr_count) FILTER (WHERE c.filled_empty_at_tv_retrieval = 'Empty'), 0)::bigint AS tv_empty,
       COALESCE(SUM(c.cylinder_dpr_count), 0)::bigint AS tv_total
FROM public.connection_sv_entries c
WHERE c.type = 'TV' AND c.cylinder_dpr_type_id IS NOT NULL
GROUP BY c.entry_date, c.cylinder_dpr_type_id;

CREATE OR REPLACE VIEW public.v_daily_defective_movement
WITH (security_invoker = true) AS
WITH events AS (
  SELECT d.date_of_identification AS entry_date, d.cylinder_dpr_type_id AS package_code_id,
         1 AS identified, 0 AS sent_to_plant, 0 AS replacement_received
  FROM public.defective_entries d
  WHERE d.cylinder_dpr_type_id IS NOT NULL AND d.date_of_identification IS NOT NULL
  UNION ALL
  SELECT d.sent_to_plant_on, d.cylinder_dpr_type_id, 0, 1, 0
  FROM public.defective_entries d
  WHERE d.cylinder_dpr_type_id IS NOT NULL AND d.sent_to_plant_on IS NOT NULL
  UNION ALL
  SELECT d.received_replacement_stock_on, d.cylinder_dpr_type_id, 0, 0, 1
  FROM public.defective_entries d
  WHERE d.cylinder_dpr_type_id IS NOT NULL AND d.received_replacement_stock_on IS NOT NULL
)
SELECT entry_date,
       package_code_id,
       SUM(identified)::bigint AS newly_identified_defective,
       SUM(sent_to_plant)::bigint AS defective_item_returned_to_plant,
       SUM(replacement_received)::bigint AS replacement_received
FROM events
GROUP BY entry_date, package_code_id;

GRANT SELECT ON public.v_daily_refill_sale TO service_role;
GRANT SELECT ON public.v_daily_sv_issues TO service_role;
GRANT SELECT ON public.v_daily_tv_retrieval TO service_role;
GRANT SELECT ON public.v_daily_defective_movement TO service_role;