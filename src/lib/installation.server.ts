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

export type InstallationInput = {
  consumer_id: string | null;
  consumer_no: string | null;
  consumer_name: string | null;
  mobile_no: string | null;
  sv_date: string | null;
  installation_date: string | null;
  type_of_stove_sold: string | null;
  lighter: boolean;
  apron: boolean;
  trolley: boolean;
  other_arb: string | null;
  total_bill_amount: number;
  total_receipt_amount: number;
  customer_sign: string | null;
  distributor_sign: string | null;
  filled_by: string | null;
};

export async function listInstallationEntries(limit = 100) {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("installation_arb_entries")
    .select("*")
    .order("sr_no", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the Installation & ARB register.");
  return (data ?? []).map((row) => ({
    ...row,
    total_bill_amount: Number(row.total_bill_amount),
    total_receipt_amount: Number(row.total_receipt_amount),
  }));
}

export async function saveInstallationEntry(input: {
  id: string | null;
  entry: InstallationInput;
  lock: boolean;
}) {
  await requireSession();

  if (input.id) {
    const { data: existing } = await supabaseAdmin
      .from("installation_arb_entries")
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
      .from("installation_arb_entries")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error("Could not save this entry.");
    return { ok: true as const, id: input.id };
  }

  const { data, error } = await supabaseAdmin
    .from("installation_arb_entries")
    .insert(payload)
    .select("id, sr_no")
    .single();
  if (error || !data) throw new Error("Could not create this entry.");
  return { ok: true as const, id: data.id, sr_no: Number(data.sr_no) };
}

export async function createConsumerRecord(input: {
  consumer_no: string;
  name: string;
  mobile_no: string | null;
}) {
  await requireSession();

  const { data: existing } = await supabaseAdmin
    .from("consumers")
    .select("id, consumer_no, name, mobile_no, address, scheme")
    .eq("consumer_no", input.consumer_no)
    .maybeSingle();
  if (existing) return { ok: true as const, consumer: existing, created: false };

  const { data, error } = await supabaseAdmin
    .from("consumers")
    .insert({
      consumer_no: input.consumer_no,
      name: input.name,
      mobile_no: input.mobile_no,
    })
    .select("id, consumer_no, name, mobile_no, address, scheme")
    .single();
  if (error || !data) throw new Error("Could not save this consumer.");
  return { ok: true as const, consumer: data, created: true };
}
