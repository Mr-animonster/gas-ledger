import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "computer_staff" && session.data.role !== "distributor") {
    throw new Error("This register is limited to computer staff and the distributor.");
  }
  return session;
}

export type ConnectionType = "New" | "Reconnection" | "Additional" | "TV";
export type TvRetrieval = "Filled" | "Empty" | "N/A";
export type Scheme = "Regular" | "PMUY" | "Extended PMUY" | "PMUY-2";

export type ConnectionInput = {
  entry_date: string;
  type: ConnectionType;
  consumer_id: string | null;
  consumer_no: string | null;
  consumer_name: string | null;
  scheme: Scheme;
  aadhaar_last4: string | null;
  bank_ac_last4: string | null;
  eligibility_check_done: boolean;
  duplicate_household_check_done: boolean;
  cylinder_dpr_type_id: string | null;
  cylinder_dpr_count: number;
  filled_empty_at_tv_retrieval: TvRetrieval;
  cash_memo_no: number | null;
  processed_by: string | null;
};

export async function listConnectionEntries(limit = 100) {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("connection_sv_entries")
    .select("*")
    .order("sr_no", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the Connection/SV register.");
  return data ?? [];
}

/** Recent cash memos from the sales register, for the optional memo link. */
export async function listRecentCashMemos(limit = 50) {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("sales_entries")
    .select("cash_memo_no, sale_date, consumer_no, consumer_name, item, amount_charged")
    .order("cash_memo_no", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load cash memos.");
  return (data ?? []).map((row) => ({
    cash_memo_no: Number(row.cash_memo_no),
    sale_date: row.sale_date,
    consumer_no: row.consumer_no,
    consumer_name: row.consumer_name,
    item: row.item,
    amount_charged: Number(row.amount_charged),
  }));
}

export async function saveConnectionEntry(input: {
  id: string | null;
  entry: ConnectionInput;
  lock: boolean;
}) {
  await requireSession();

  if (input.id) {
    const { data: existing } = await supabaseAdmin
      .from("connection_sv_entries")
      .select("locked")
      .eq("id", input.id)
      .maybeSingle();
    if (existing?.locked) {
      throw new Error("This entry is locked. Request an edit to make changes.");
    }
  }

  const payload = {
    ...input.entry,
    locked: input.lock,
    locked_at: input.lock ? new Date().toISOString() : null,
  };

  if (input.id) {
    const { error } = await supabaseAdmin
      .from("connection_sv_entries")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error("Could not save this entry.");
    return { ok: true as const, id: input.id };
  }

  const { data, error } = await supabaseAdmin
    .from("connection_sv_entries")
    .insert(payload)
    .select("id, sr_no")
    .single();
  if (error || !data) throw new Error("Could not create this entry.");
  return { ok: true as const, id: data.id, sr_no: Number(data.sr_no) };
}
