import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";
import {
  REGISTER_EXPORTS,
  type RegisterExportPayload,
  type RegisterKey,
} from "./register-export-config";

type Row = Record<string, unknown>;

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

async function requireAccess(key: RegisterKey) {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  const role = session.data.role;
  const config = REGISTER_EXPORTS[key];
  if (!role || !config.roles.includes(role)) {
    throw new Error("You do not have access to export this register.");
  }
  return { role, agencyName: session.data.agencyName ?? "LPG Agency" };
}

/** Flattens an SQC header row into one printable row per sampled cylinder. */
function expandSqc(rows: Row[]) {
  const out: { cells: string[]; row: Row }[] = [];
  for (const header of rows) {
    const base = REGISTER_EXPORTS.sqc.map(header);
    const items = (header["sqc_line_items"] as Row[] | null) ?? [];
    if (items.length === 0) {
      out.push({ cells: base, row: header });
      continue;
    }
    for (const item of [...items].sort((a, b) => Number(a["s_no"]) - Number(b["s_no"]))) {
      const cells = [...base];
      cells[6] = s(item["s_no"]);
      cells[7] = s((item["package_codes"] as Row | null)?.["code"]);
      cells[8] = s(item["tare_weight"]);
      cells[9] = s(item["gross_weight"]);
      cells[10] = s(item["observed_weight"]);
      cells[11] = s(item["variation"]);
      cells[12] = s(item["dpt_date"]);
      cells[13] = s(item["sealing_condition"]);
      cells[14] = s(item["leaky_body_bung"]);
      cells[15] = s(item["remarks"]);
      out.push({ cells, row: header });
    }
  }
  return out;
}

async function loadRows(key: RegisterKey, from: string, to: string, role: string): Promise<Row[]> {
  const config = REGISTER_EXPORTS[key];

  // Wage + inspection tables carry no grants — they are only reachable via
  // their SECURITY DEFINER functions, which re-check the distributor role.
  if (key === "wage") {
    const { data, error } = await supabaseAdmin.rpc("wage_entries_list", {
      p_role: role,
      p_month: null,
    } as never);
    if (error) throw new Error("Could not load the Staff Wage register.");
    const fromMonth = from.slice(0, 7);
    const toMonth = to.slice(0, 7);
    return ((data as Row[] | null) ?? []).filter((r) => {
      const m = String(r["month_year"] ?? "").slice(0, 7);
      return m >= fromMonth && m <= toMonth;
    });
  }

  if (key === "inspection") {
    const { data, error } = await supabaseAdmin.rpc("inspection_entries_list", {
      p_role: role,
    } as never);
    if (error) throw new Error("Could not load the Inspection log.");
    return ((data as Row[] | null) ?? []).filter((r) => {
      const d = String(r["inspection_date"] ?? "");
      return d >= from && d <= to;
    });
  }

  const { data, error } = await supabaseAdmin
    .from(config.table as "complaint_entries")
    .select(config.select)
    .gte(config.dateColumn, from)
    .lte(config.dateColumn, to)
    .order(config.dateColumn, { ascending: true })
    .limit(5000);
  if (error) throw new Error(`Could not load the ${config.label}.`);
  return (data as unknown as Row[]) ?? [];
}

async function loadEdits(table: string, ids: string[], labelById: Map<string, string>) {
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("entry_edit_history")
    .select("entry_id, field_name, old_value, new_value, edited_at, edit_request_id")
    .eq("table_name", table)
    .in("entry_id", ids)
    .order("edited_at", { ascending: true })
    .limit(2000);
  if (error) return [];
  return (data ?? []).map((e) => ({
    entryLabel: labelById.get(e.entry_id) ?? e.entry_id.slice(0, 8),
    field: e.field_name,
    oldValue: e.old_value,
    newValue: e.new_value,
    editedAt: e.edited_at,
    requestRef: e.edit_request_id ? e.edit_request_id.slice(0, 8).toUpperCase() : null,
  }));
}

export async function buildRegisterExport(
  key: RegisterKey,
  from: string,
  to: string,
): Promise<RegisterExportPayload> {
  const config = REGISTER_EXPORTS[key];
  const { role, agencyName } = await requireAccess(key);
  const raw = await loadRows(key, from, to, role);

  const expanded =
    key === "sqc" ? expandSqc(raw) : raw.map((row) => ({ cells: config.map(row), row }));

  const labelById = new Map<string, string>();
  for (const { cells, row } of expanded) {
    const id = row["id"];
    if (typeof id === "string") labelById.set(id, `${cells[0]} · ${cells[1] ?? ""}`.trim());
  }

  const edits = await loadEdits(config.table, [...labelById.keys()], labelById);

  return {
    key,
    title: config.label,
    orientation: config.orientation,
    agencyName,
    from,
    to,
    columns: config.columns,
    rows: expanded.map((e) => e.cells),
    trail: expanded.map(({ row }) => ({
      created_at: (row["created_at"] as string | null) ?? null,
      locked_at: (row["locked_at"] as string | null) ?? null,
    })),
    edits,
  };
}
