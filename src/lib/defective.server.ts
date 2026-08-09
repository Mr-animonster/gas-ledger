import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "godown" && session.data.role !== "distributor") {
    throw new Error("This register is limited to godown staff and the distributor.");
  }
  return session;
}

export type DefectSource = "Truck" | "Consumer";
export type DefectSeal = "OK" | "Damaged" | "N/A";

export type DefectiveInput = {
  date_of_identification: string;
  cylinder_dpr_type_id: string | null;
  cylinder_dpr_sr_no: string | null;
  batch_no: string | null;
  seal_condition: DefectSeal;
  nature_of_defect: string | null;
  source: DefectSource;
  tt_no: string | null;
  consumer_id: string | null;
  consumer_no: string | null;
  consumer_name: string | null;
  consumer_contact: string | null;
  prcn: string | null;
  prcn_sent_on: string | null;
  prcn_received: boolean;
  driver_consumer_signature: string | null;
  plant_name: string | null;
  sent_to_plant_on: string | null;
  received_replacement_stock_on: string | null;
  distributor_signature: string | null;
  filled_by: string | null;
};

export async function listDefectiveEntries(limit = 100) {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("defective_entries")
    .select("*")
    .order("sr_no", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the Defective Cylinder/DPR register.");
  return data ?? [];
}

export async function saveDefectiveEntry(input: {
  id: string | null;
  entry: DefectiveInput;
  lock: boolean;
}) {
  await requireSession();

  if (input.id) {
    const { data: existing } = await supabaseAdmin
      .from("defective_entries")
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
      .from("defective_entries")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error("Could not save this entry.");
    return { ok: true as const, id: input.id };
  }

  const { data, error } = await supabaseAdmin
    .from("defective_entries")
    .insert(payload)
    .select("id, sr_no")
    .single();
  if (error || !data) throw new Error("Could not create this entry.");
  return { ok: true as const, id: data.id, sr_no: Number(data.sr_no) };
}
