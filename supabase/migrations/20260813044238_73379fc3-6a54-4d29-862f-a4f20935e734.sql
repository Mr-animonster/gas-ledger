UPDATE public.distributor_settings
SET password = 'scrypt$9a4ac554b0b3a7004eaa3763731005a8$06cd035b4f4b67557dec7986cde511e06a655aeafc6d2bed37382e907d1efe0b026482ab835783b1135559cbd92bb8a3d1648996f817abdaaa2351902cddd9c1'
WHERE password = 'lpg1234';

REVOKE ALL ON FUNCTION public.assert_distributor(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inspection_entries_list(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inspection_entries_save(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wage_entries_list(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wage_entries_save(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_todays_entries() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_entry_edit() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assert_distributor(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.inspection_entries_list(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.inspection_entries_save(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.wage_entries_list(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wage_entries_save(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.lock_todays_entries() TO service_role;