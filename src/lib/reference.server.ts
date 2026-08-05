import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  return session;
}

export async function listPackageCodes() {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("package_codes")
    .select("id, code, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Could not load package codes.");
  return data ?? [];
}

export type ConsumerRecord = {
  id: string;
  consumer_no: string;
  name: string;
  mobile_no: string | null;
  address: string | null;
  scheme: string;
};

export async function searchConsumersByTerm(term: string, limit = 8): Promise<ConsumerRecord[]> {
  await requireSession();
  const query = term.trim();
  if (query.length < 2) return [];

  const escaped = query.replace(/[%,()]/g, "");
  if (!escaped) return [];

  const { data, error } = await supabaseAdmin
    .from("consumers")
    .select("id, consumer_no, name, mobile_no, address, scheme")
    .or(`consumer_no.ilike.%${escaped}%,name.ilike.%${escaped}%`)
    .order("consumer_no", { ascending: true })
    .limit(limit);

  if (error) throw new Error("Could not search consumers.");
  return (data ?? []) as ConsumerRecord[];
}
