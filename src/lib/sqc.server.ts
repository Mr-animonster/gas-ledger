import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";
import { computeVariation } from "./sqc-math";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "godown" && session.data.role !== "distributor") {
    throw new Error("This register is limited to godown staff and the distributor.");
  }
  return session;
}

export const DEFAULT_TOLERANCE_GRAMS = 10;

export async function getToleranceGrams() {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "sqc_tolerance_grams")
    .maybeSingle();
  const parsed = Number(data?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOLERANCE_GRAMS;
}

export type SqcHeader = {
  invoice_no: string;
  invoice_date: string | null;
  transporter: string | null;
  truck_no: string | null;
  coming_from: string | null;
  received_date: string;
  total_cylinders: number;
  godown_keeper_signature: string | null;
  proprietor_partner_signature: string | null;
  filled_by: string | null;
};

export type SqcLine = {
  s_no: number;
  cylinder_type_id: string | null;
  tare_weight: number;
  gross_weight: number;
  observed_weight: number;
  dpt_date: string | null;
  sealing_condition: "OK" | "Damaged";
  leaky_body_bung: "None" | "Body" | "Bung";
  remarks: string | null;
};

export async function listSqcEntries() {
  await requireSession();
  const { data, error } = await supabaseAdmin
    .from("sqc_entries")
    .select("id, invoice_no, truck_no, transporter, received_date, total_cylinders, locked")
    .order("received_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Could not load SQC entries.");
  return data ?? [];
}

export async function getSqcEntry(id: string) {
  await requireSession();
  const [{ data: entry, error }, { data: items, error: itemsError }, tolerance] = await Promise.all([
    supabaseAdmin.from("sqc_entries").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("sqc_line_items")
      .select("*")
      .eq("sqc_entry_id", id)
      .order("s_no", { ascending: true }),
    getToleranceGrams(),
  ]);
  if (error || itemsError) throw new Error("Could not load this SQC entry.");
  if (!entry) throw new Error("SQC entry not found.");
  return {
    entry,
    items: (items ?? []).map((item) => ({
      ...item,
      tare_weight: Number(item.tare_weight),
      gross_weight: Number(item.gross_weight),
      observed_weight: Number(item.observed_weight),
      variation: Number(item.variation),
    })),
    toleranceGrams: tolerance,
  };
}

export async function saveSqcEntry(input: {
  id: string | null;
  header: SqcHeader;
  items: SqcLine[];
  lock: boolean;
}) {
  await requireSession();

  if (input.id) {
    const { data: existing } = await supabaseAdmin
      .from("sqc_entries")
      .select("locked")
      .eq("id", input.id)
      .maybeSingle();
    if (existing?.locked) {
      throw new Error("This entry is locked. Request an edit to make changes.");
    }
  }

  const headerPayload = {
    ...input.header,
    locked: input.lock,
    locked_at: input.lock ? new Date().toISOString() : null,
  };

  let entryId = input.id;
  if (entryId) {
    const { error } = await supabaseAdmin
      .from("sqc_entries")
      .update(headerPayload)
      .eq("id", entryId);
    if (error) throw new Error("Could not save the truck entry.");
  } else {
    const { data, error } = await supabaseAdmin
      .from("sqc_entries")
      .insert(headerPayload)
      .select("id")
      .single();
    if (error || !data) throw new Error("Could not create the truck entry.");
    entryId = data.id;
  }

  const { error: deleteError } = await supabaseAdmin
    .from("sqc_line_items")
    .delete()
    .eq("sqc_entry_id", entryId);
  if (deleteError) throw new Error("Could not update the sampled cylinders.");

  if (input.items.length > 0) {
    const rows = input.items.map((item, index) => ({
      sqc_entry_id: entryId!,
      s_no: index + 1,
      cylinder_type_id: item.cylinder_type_id,
      tare_weight: item.tare_weight,
      gross_weight: item.gross_weight,
      observed_weight: item.observed_weight,
      variation: computeVariation(item),
      dpt_date: item.dpt_date,
      sealing_condition: item.sealing_condition,
      leaky_body_bung: item.leaky_body_bung,
      remarks: item.remarks,
    }));
    const { error } = await supabaseAdmin.from("sqc_line_items").insert(rows);
    if (error) throw new Error("Could not save the sampled cylinders.");
  }

  return getSqcEntry(entryId!);
}
