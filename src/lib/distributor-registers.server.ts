import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";

/**
 * Wage + inspection registers are distributor-only.
 * The database itself refuses these calls unless the role passed to the
 * SECURITY DEFINER functions is 'distributor' — the tables have no grants,
 * so even the service key cannot read or write them directly.
 */
async function requireDistributor() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "distributor") {
    throw new Error("This register is restricted to the distributor.");
  }
  return "distributor" as const;
}

export type WageInput = {
  month_year: string;
  staff_id: string | null;
  staff_name: string | null;
  role: "godown" | "computer_staff" | "distributor" | null;
  days_worked: number;
  gross_wage: number;
  pf_applicable: number;
  esi_applicable: number;
  net_paid: number;
  net_paid_override: boolean;
  payment_mode: string | null;
  payment_date: string | null;
  remarks: string | null;
  proprietor_signature: string | null;
  locked: boolean;
};

export async function listWageEntries(month: string | null) {
  const role = await requireDistributor();
  const { data, error } = await supabaseAdmin.rpc("wage_entries_list", {
    p_role: role,
    p_month: month,
  } as never);
  if (error) throw new Error("Could not load the Staff Wage register.");
  return data ?? [];
}

export async function saveWageEntry(input: { id: string | null; entry: WageInput }) {
  const role = await requireDistributor();
  const { data, error } = await supabaseAdmin.rpc("wage_entries_save", {
    p_role: role,
    p_id: input.id,
    p_payload: input.entry,
  } as never);
  if (error) throw new Error(error.message || "Could not save this wage entry.");
  return { ok: true as const, id: data as unknown as string };
}

export type InspectionInput = {
  inspection_date: string;
  officer_name_designation: string | null;
  type: "Routine" | "Surprise" | "Investigation";
  irregularity_category: "Critical" | "Major" | "Minor" | "None";
  scn_date: string | null;
  reply_date: string | null;
  speaking_order_date: string | null;
  fine_amount: number;
  report_filed: boolean;
  report_file_ref: string | null;
  locked: boolean;
};

export async function listInspectionEntries() {
  const role = await requireDistributor();
  const { data, error } = await supabaseAdmin.rpc("inspection_entries_list", { p_role: role });
  if (error) throw new Error("Could not load the Inspection log.");
  return data ?? [];
}

export async function saveInspectionEntry(input: { id: string | null; entry: InspectionInput }) {
  const role = await requireDistributor();
  const { data, error } = await supabaseAdmin.rpc("inspection_entries_save", {
    p_role: role,
    p_id: input.id,
    p_payload: input.entry,
  } as never);
  if (error) throw new Error(error.message || "Could not save this inspection entry.");
  return { ok: true as const, id: data as unknown as string };
}
