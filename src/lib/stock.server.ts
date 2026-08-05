import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";
import { computeClosing, EMPTY_INPUTS, type StockInputs } from "./stock-math";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "godown" && session.data.role !== "distributor") {
    throw new Error("This register is limited to godown staff and the distributor.");
  }
  return session;
}

const NUMERIC_FIELDS = Object.keys(EMPTY_INPUTS) as (keyof StockInputs)[];

export type StockRow = StockInputs & {
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

export async function loadStockDay(stockDate: string) {
  await requireSession();

  const { data: packages, error: pkgError } = await supabaseAdmin
    .from("package_codes")
    .select("id, code, sort_order")
    .eq("active", true)
    .order("sort_order");
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
    const opening = {
      opening_good_filled: prev?.closing_good_filled ?? 0,
      opening_good_empty: prev?.closing_good_empty ?? 0,
      opening_defective_filled: prev?.closing_defective_filled ?? 0,
      opening_defective_empty: prev?.closing_defective_empty ?? 0,
    };
    const existing = byPackage.get(pkg.id);

    const base: StockInputs = {
      ...EMPTY_INPUTS,
      ...opening,
    };

    if (existing) {
      for (const field of NUMERIC_FIELDS) {
        if (field.startsWith("opening_")) continue;
        base[field] = (existing as Record<string, number>)[field] ?? 0;
      }
    }

    const closing = computeClosing(base);

    return {
      ...base,
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

export type SaveStockRowInput = {
  package_code_id: string;
} & Omit<StockInputs, keyof typeof openingKeys> &
  Partial<StockInputs>;

const openingKeys = {
  opening_good_filled: 0,
  opening_good_empty: 0,
  opening_defective_filled: 0,
  opening_defective_empty: 0,
};

export async function saveStockDay(input: {
  stockDate: string;
  filledBy: string | null;
  rows: { package_code_id: string; values: Partial<StockInputs> }[];
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
      merged[field] = field.startsWith("opening_")
        ? base[field]
        : Math.max(0, Math.round(Number(row.values[field] ?? base[field]) || 0));
    }

    return {
      ...merged,
      ...computeClosing(merged),
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
