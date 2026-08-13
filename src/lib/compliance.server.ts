import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";

/** Registers tracked on the distributor compliance board, with their "business date" column. */
export const COMPLIANCE_REGISTERS = [
  { table: "stock_entries", dateColumn: "stock_date", label: "Daily Stock", to: "/registers/stock" },
  { table: "sqc_entries", dateColumn: "received_date", label: "SQC", to: "/registers/sqc" },
  { table: "sales_batches", dateColumn: "batch_date", label: "Sales", to: "/registers/sales" },
  {
    table: "installation_arb_entries",
    dateColumn: "entry_date",
    label: "Installation & ARB",
    to: "/registers/installation",
  },
  {
    table: "connection_sv_entries",
    dateColumn: "entry_date",
    label: "Connection / SV",
    to: "/registers/connection",
  },
  {
    table: "defective_entries",
    dateColumn: "date_of_identification",
    label: "Defective / DPR",
    to: "/registers/defective",
  },
  {
    table: "complaint_entries",
    dateColumn: "entry_date",
    label: "Complaint",
    to: "/registers/complaint",
  },
] as const;

export type ComplianceRegister = (typeof COMPLIANCE_REGISTERS)[number];

/** Agency local day (IST) as YYYY-MM-DD. */
export function agencyToday() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function agencyDateOf(iso: string) {
  return new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function requireDistributor() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "distributor") {
    throw new Error("This view is restricted to the distributor.");
  }
}

type Row = { date: string; locked: boolean; locked_at: string | null };

async function loadRows(reg: ComplianceRegister, from: string, to: string): Promise<Row[]> {
  const { data, error } = await supabaseAdmin
    .from(reg.table as "complaint_entries")
    .select(`${reg.dateColumn}, locked, locked_at`)
    .gte(reg.dateColumn, from)
    .lte(reg.dateColumn, to)
    .limit(5000);

  if (error) throw new Error(`Could not load the ${reg.label} register status.`);
  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      date: String(r[reg.dateColumn]),
      locked: r["locked"] === true,
      locked_at: (r["locked_at"] as string | null) ?? null,
    };
  });
}

export type DayStatus = "locked" | "in_progress" | "missing" | "filled_late";

export type RegisterDayStatus = {
  table: string;
  label: string;
  to: string;
  total: number;
  locked: number;
  status: DayStatus;
};

export async function getDayStatus(date: string) {
  await requireDistributor();
  const today = agencyToday();
  const isToday = date === today;

  const results = await Promise.all(
    COMPLIANCE_REGISTERS.map(async (reg) => {
      const rows = await loadRows(reg, date, date);
      const locked = rows.filter((r) => r.locked).length;
      let status: DayStatus;
      if (rows.length === 0) status = "missing";
      else if (locked === rows.length) status = "locked";
      else status = isToday ? "in_progress" : "filled_late";
      return {
        table: reg.table,
        label: reg.label,
        to: reg.to,
        total: rows.length,
        locked,
        status,
      } satisfies RegisterDayStatus;
    }),
  );

  return { date, isToday, registers: results };
}

export type HeatmapCell = { date: string; status: "on_time" | "late" | "missed" };

export async function getHeatmap(from: string, to: string) {
  await requireDistributor();
  const today = agencyToday();

  const registers = await Promise.all(
    COMPLIANCE_REGISTERS.map(async (reg) => {
      const rows = await loadRows(reg, from, to);
      const byDate = new Map<string, Row[]>();
      for (const row of rows) {
        const list = byDate.get(row.date) ?? [];
        list.push(row);
        byDate.set(row.date, list);
      }

      const days: HeatmapCell[] = [];
      for (const date of eachDate(from, to)) {
        if (date > today) continue;
        const list = byDate.get(date) ?? [];
        if (list.length === 0) {
          days.push({ date, status: "missed" });
          continue;
        }
        // "On time" = every entry for that day was locked on the same agency day.
        const onTime = list.every(
          (r) => r.locked && r.locked_at !== null && agencyDateOf(r.locked_at) <= date,
        );
        days.push({ date, status: onTime ? "on_time" : "late" });
      }

      return { table: reg.table, label: reg.label, days };
    }),
  );

  return { from, to, today, registers };
}

function eachDate(from: string, to: string) {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let t = start; t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
