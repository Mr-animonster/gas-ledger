import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";
import {
  AUTO_FIELDS,
  computeClosing,
  EMPTY_INPUTS,
  MANUAL_FIELDS,
  type StockInputs,
  type TvSplit,
} from "./stock-math";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "godown" && session.data.role !== "distributor") {
    throw new Error("This register is limited to godown staff and the distributor.");
  }
  return session;
}

const NUMERIC_FIELDS = Object.keys(EMPTY_INPUTS) as (keyof StockInputs)[];

export type StockRow = StockInputs &
  TvSplit & {
    id: string | null;
    package_code_id: string;
    package_code: string;
    closing_good_filled: number;
    closing_good_empty: number;
    closing_defective_filled: number;
    closing_defective_empty: number;
    filled_by: string | null;
    locked: boolean;
    locked_at: string | null;
  };

type AutoValues = Pick<StockInputs, (typeof AUTO_FIELDS)[number]> & TvSplit;

const EMPTY_AUTO: AutoValues = {
  refill_sale: 0,
  sv_new_issues: 0,
  sv_reconnection_issues: 0,
  sv_additional_issues: 0,
  received_from_consumer_against_tv: 0,
  defective_item_returned_to_plant: 0,
  newly_identified_defective: 0,
  tv_filled: 0,
  tv_empty: 0,
};

/** Live figures pulled from the source registers via database views. */
async function loadAutoValues(stockDate: string) {
  const [refill, sv, tv, defective] = await Promise.all([
    supabaseAdmin
      .from("v_daily_refill_sale")
      .select("package_code_id, refill_sale")
      .eq("entry_date", stockDate),
    supabaseAdmin
      .from("v_daily_sv_issues")
      .select("package_code_id, sv_new_issues, sv_reconnection_issues, sv_additional_issues")
      .eq("entry_date", stockDate),
    supabaseAdmin
      .from("v_daily_tv_retrieval")
      .select("package_code_id, tv_filled, tv_empty, tv_total")
      .eq("entry_date", stockDate),
    supabaseAdmin
      .from("v_daily_defective_movement")
      .select("package_code_id, newly_identified_defective, defective_item_returned_to_plant")
      .eq("entry_date", stockDate),
  ]);

  if (refill.error || sv.error || tv.error || defective.error) {
    throw new Error("Could not load the auto-pulled figures from the source registers.");
  }

  const map = new Map<string, AutoValues>();
  const get = (id: string | null) => {
    if (!id) return null;
    if (!map.has(id)) map.set(id, { ...EMPTY_AUTO });
    return map.get(id)!;
  };

  for (const row of refill.data ?? []) {
    const target = get(row.package_code_id);
    if (target) target.refill_sale = Number(row.refill_sale ?? 0);
  }
  for (const row of sv.data ?? []) {
    const target = get(row.package_code_id);
    if (!target) continue;
    target.sv_new_issues = Number(row.sv_new_issues ?? 0);
    target.sv_reconnection_issues = Number(row.sv_reconnection_issues ?? 0);
    target.sv_additional_issues = Number(row.sv_additional_issues ?? 0);
  }
  for (const row of tv.data ?? []) {
    const target = get(row.package_code_id);
    if (!target) continue;
    target.tv_filled = Number(row.tv_filled ?? 0);
    target.tv_empty = Number(row.tv_empty ?? 0);
    target.received_from_consumer_against_tv = Number(row.tv_total ?? 0);
  }
  for (const row of defective.data ?? []) {
    const target = get(row.package_code_id);
    if (!target) continue;
    target.newly_identified_defective = Number(row.newly_identified_defective ?? 0);
    target.defective_item_returned_to_plant = Number(row.defective_item_returned_to_plant ?? 0);
  }

  return map;
}

export async function loadStockDay(stockDate: string) {
  await requireSession();

  const [{ data: packages, error: pkgError }, autoValues] = await Promise.all([
    supabaseAdmin
      .from("package_codes")
      .select("id, code, sort_order")
      .eq("active", true)
      .order("sort_order"),
    loadAutoValues(stockDate),
  ]);
  if (pkgError) throw new Error("Could not load package codes.");

  const { data: entries, error: entryError } = await supabaseAdmin
    .from("stock_entries")
    .select("*")
    .eq("stock_date", stockDate);
  if (entryError) throw new Error("Could not load stock entries.");

  // Previous day's closing per package: latest entry strictly before this date.
  const { data: previous, error: prevError } = await supabaseAdmin
    .from("stock_entries")
    .select(
      "package_code_id, stock_date, closing_good_filled, closing_good_empty, closing_defective_filled, closing_defective_empty",
    )
    .lt("stock_date", stockDate)
    .order("stock_date", { ascending: false });
  if (prevError) throw new Error("Could not load previous balances.");

  const latestPrev = new Map<string, (typeof previous)[number]>();
  for (const row of previous ?? []) {
    if (!latestPrev.has(row.package_code_id)) latestPrev.set(row.package_code_id, row);
  }

  const byPackage = new Map((entries ?? []).map((e) => [e.package_code_id, e]));

  const rows: StockRow[] = (packages ?? []).map((pkg) => {
    const prev = latestPrev.get(pkg.id);
    const existing = byPackage.get(pkg.id);
    const auto = autoValues.get(pkg.id) ?? EMPTY_AUTO;

    const base: StockInputs = {
      ...EMPTY_INPUTS,
      opening_good_filled: prev?.closing_good_filled ?? 0,
      opening_good_empty: prev?.closing_good_empty ?? 0,
      opening_defective_filled: prev?.closing_defective_filled ?? 0,
      opening_defective_empty: prev?.closing_defective_empty ?? 0,
    };

    if (existing) {
      for (const field of MANUAL_FIELDS) {
        base[field] = Number((existing as unknown as Record<string, number>)[field] ?? 0);
      }
    }

    // Auto fields always reflect the source registers, never the stored copy.
    for (const field of AUTO_FIELDS) base[field] = auto[field];

    const tv: TvSplit = { tv_filled: auto.tv_filled, tv_empty: auto.tv_empty };
    const closing = computeClosing(base, tv);

    return {
      ...base,
      ...tv,
      ...closing,
      id: existing?.id ?? null,
      package_code_id: pkg.id,
      package_code: pkg.code,
      filled_by: existing?.filled_by ?? null,
      locked: existing?.locked ?? false,
      locked_at: existing?.locked_at ?? null,
    };
  });

  return {
    stockDate,
    locked: rows.some((r) => r.locked),
    rows,
  };
}

export async function saveStockDay(input: {
  stockDate: string;
  filledBy: string | null;
  rows: { package_code_id: string; values: { [K in keyof StockInputs]?: number | undefined } }[];
}) {
  await requireSession();

  const current = await loadStockDay(input.stockDate);
  if (current.locked) throw new Error("This day is locked. Request an edit to make changes.");

  const byPackage = new Map(current.rows.map((r) => [r.package_code_id, r]));

  const payload = input.rows.map((row) => {
    const base = byPackage.get(row.package_code_id);
    if (!base) throw new Error("Unknown package code.");

    const merged: StockInputs = { ...EMPTY_INPUTS };
    for (const field of NUMERIC_FIELDS) {
      // Only the manual fields come from the client; everything else is authoritative server-side.
      merged[field] = (MANUAL_FIELDS as readonly string[]).includes(field)
        ? Math.max(0, Math.round(Number(row.values[field] ?? base[field]) || 0))
        : base[field];
    }

    return {
      ...merged,
      ...computeClosing(merged, { tv_filled: base.tv_filled, tv_empty: base.tv_empty }),
      stock_date: input.stockDate,
      package_code_id: row.package_code_id,
      filled_by: input.filledBy,
    };
  });

  const { error } = await supabaseAdmin
    .from("stock_entries")
    .upsert(payload, { onConflict: "stock_date,package_code_id" });
  if (error) throw new Error("Could not save the stock register.");

  return loadStockDay(input.stockDate);
}
