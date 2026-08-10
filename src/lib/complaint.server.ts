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

export type ComplaintNature = "Delay" | "Leakage" | "Behaviour" | "Other";

export type ComplaintInput = {
  entry_date: string;
  consumer_id: string | null;
  consumer_no: string | null;
  consumer_name: string | null;
  consumer_contact: string | null;
  complaint_text: string;
  nature: ComplaintNature;
  action_taken: string | null;
  resolved_date: string | null;
  resolved_by: string | null;
};

export async function listComplaintEntries(limit = 200) {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("complaint_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("sr_no", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the Complaint register.");
  return data ?? [];
}

export async function saveComplaintEntry(input: { id: string | null; entry: ComplaintInput }) {
  await requireSession();

  if (input.id) {
    const { data: existing } = await supabaseAdmin
      .from("complaint_entries")
      .select("locked")
      .eq("id", input.id)
      .maybeSingle();
    if (existing?.locked) {
      throw new Error("This complaint is locked. Request an edit to make changes.");
    }

    const { error } = await supabaseAdmin
      .from("complaint_entries")
      .update(input.entry)
      .eq("id", input.id);
    if (error) throw new Error("Could not save this complaint.");
    return { ok: true as const, id: input.id };
  }

  const { data, error } = await supabaseAdmin
    .from("complaint_entries")
    .insert(input.entry)
    .select("id, sr_no")
    .single();
  if (error || !data) throw new Error("Could not create this complaint.");
  return { ok: true as const, id: data.id, sr_no: Number(data.sr_no) };
}
