import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { getComplianceDay, getComplianceHeatmap } from "@/lib/compliance.functions";

function agencyToday() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const STATUS_STYLES: Record<string, { label: string; chip: string; card: string }> = {
  locked: {
    label: "Filled & Locked",
    chip: "bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]",
    card: "border-[hsl(var(--status-ok))]/50",
  },
  filled: {
    label: "Filled",
    chip: "bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]",
    card: "border-[hsl(var(--status-ok))]/50",
  },
  in_progress: {
    label: "In Progress",
    chip: "bg-[hsl(var(--status-warn))] text-[hsl(var(--status-warn-foreground))]",
    card: "border-[hsl(var(--status-warn))]/60",
  },
  filled_late: {
    label: "Filled (not locked)",
    chip: "bg-[hsl(var(--status-warn))] text-[hsl(var(--status-warn-foreground))]",
    card: "border-[hsl(var(--status-warn))]/60",
  },
  missing: {
    label: "Not Started",
    chip: "bg-destructive text-destructive-foreground",
    card: "border-destructive/60",
  },
};

export function ComplianceBoard() {
  const today = agencyToday();
  const [date, setDate] = useState(today);
  const [range, setRange] = useState<7 | 30>(7);
  const navigate = useNavigate();

  const fetchDay = useServerFn(getComplianceDay);
  const fetchHeatmap = useServerFn(getComplianceHeatmap);

  const { data: day, isPending } = useQuery({
    queryKey: ["compliance-day", date],
    queryFn: () => fetchDay({ data: { date } }),
    // Registers are written through server functions, so the board polls
    // for live updates while staff are entering data.
    refetchInterval: date === today ? 10_000 : false,
    refetchOnWindowFocus: true,
  });

  const heatFrom = useMemo(() => shiftDate(today, -(range - 1)), [today, range]);
  const { data: heatmap } = useQuery({
    queryKey: ["compliance-heatmap", heatFrom, today],
    queryFn: () => fetchHeatmap({ data: { from: heatFrom, to: today } }),
    refetchInterval: 60_000,
  });

  const isToday = date === today;
  const attention = (day?.registers ?? []).filter((r) => r.status !== "locked").length;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Compliance status
          </h2>
          <p className="mt-1 text-base font-semibold text-foreground">
            {isToday
              ? attention === 0
                ? "All registers filled and locked for today."
                : `${attention} register${attention === 1 ? "" : "s"} still need attention today.`
              : `Status for ${new Date(`${date}T00:00:00Z`).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="h-10 w-10 rounded-lg border border-input bg-background text-lg font-semibold text-foreground hover:bg-secondary"
            aria-label="Previous day"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1) > today ? today : shiftDate(date, 1))}
            disabled={isToday}
            className="h-10 w-10 rounded-lg border border-input bg-background text-lg font-semibold text-foreground hover:bg-secondary disabled:opacity-40"
            aria-label="Next day"
          >
            ›
          </button>
          {!isToday ? (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Today
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(day?.registers ?? []).map((reg) => {
          const key = !isToday && reg.status === "filled_late" ? "filled" : reg.status;
          const style = STATUS_STYLES[key] ?? STATUS_STYLES["missing"]!;
          const badge =
            !isToday && reg.status === "locked"
              ? "Filled"
              : !isToday && reg.status === "missing"
                ? "Missing"
                : style.label;
          return (
            <button
              key={reg.table}
              type="button"
              onClick={() => void navigate({ to: reg.to })}
              className={`rounded-xl border-2 bg-card p-4 text-left shadow-sm transition-colors hover:bg-secondary ${style.card}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-base font-semibold text-foreground">{reg.label}</span>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${style.chip}`}
                >
                  {badge}
                </span>
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                {reg.total === 0
                  ? "No entries for this date"
                  : `${reg.total} entr${reg.total === 1 ? "y" : "ies"} · ${reg.locked} locked`}
              </span>
            </button>
          );
        })}
        {isPending && !day
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
            ))
          : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Filing pattern
          </h3>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
              <Legend className="bg-[hsl(var(--status-ok))]" text="On time" />
              <Legend className="bg-[hsl(var(--status-warn))]" text="Late / open" />
              <Legend className="bg-destructive" text="Missed" />
            </div>
            <div className="flex overflow-hidden rounded-lg border border-input">
              {([7, 30] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`h-9 px-3 text-xs font-semibold ${
                    range === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {r} days
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 overflow-x-auto">
          {(heatmap?.registers ?? []).map((reg) => (
            <div key={reg.table} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-xs font-medium text-foreground">
                {reg.label}
              </span>
              <div className="flex gap-1">
                {reg.days.map((cell) => (
                  <span
                    key={cell.date}
                    title={`${reg.label} — ${cell.date}: ${cell.status.replace("_", " ")}`}
                    className={`h-5 w-5 rounded-sm ${
                      cell.status === "on_time"
                        ? "bg-[hsl(var(--status-ok))]"
                        : cell.status === "late"
                          ? "bg-[hsl(var(--status-warn))]"
                          : "bg-destructive/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Legend({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      {text}
    </span>
  );
}
