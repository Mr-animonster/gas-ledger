import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { EditedBadge } from "@/components/EditedBadge";
import { FilledBySelect } from "@/components/FilledBySelect";
import { RequestEditButton } from "@/components/RequestEditButton";
import { getSessionState } from "@/lib/agency.functions";
import { getStockDay, saveStockEntries } from "@/lib/stock.functions";
import { computeClosing, type StockInputs } from "@/lib/stock-math";
import { ExportPdfButton } from "@/components/ExportPdfButton";

type EditableField = "received_from_plant" | "received_from_consumer_refill" | "returned_to_plant";

type AutoColumn =
  | "refill_sale"
  | "sv_new_issues"
  | "sv_reconnection_issues"
  | "sv_additional_issues"
  | "received_from_consumer_against_tv"
  | "defective_item_returned_to_plant"
  | "newly_identified_defective";

const EDITABLE_COLUMNS: { field: EditableField; label: string }[] = [
  { field: "received_from_plant", label: "Recd. from Plant" },
  { field: "received_from_consumer_refill", label: "Recd. Consumer (Refill)" },
  { field: "returned_to_plant", label: "Returned to Plant" },
];

const AUTO_COLUMNS: { field: AutoColumn; label: string; source: string }[] = [
  { field: "refill_sale", label: "Refill Sale", source: "Sales Register" },
  { field: "sv_new_issues", label: "SV New", source: "Connection/SV Register" },
  { field: "sv_reconnection_issues", label: "SV Reconnection", source: "Connection/SV Register" },
  { field: "sv_additional_issues", label: "SV Additional", source: "Connection/SV Register" },
  {
    field: "received_from_consumer_against_tv",
    label: "Recd. Consumer (TV)",
    source: "Connection/SV Register",
  },
  {
    field: "newly_identified_defective",
    label: "Newly Defective",
    source: "Defective Register",
  },
  {
    field: "defective_item_returned_to_plant",
    label: "Defective to Plant",
    source: "Defective Register",
  },
];

const OPENING_COLUMNS: { field: keyof StockInputs; label: string }[] = [
  { field: "opening_good_filled", label: "Op. Good Filled" },
  { field: "opening_good_empty", label: "Op. Good Empty" },
  { field: "opening_defective_filled", label: "Op. Def. Filled" },
  { field: "opening_defective_empty", label: "Op. Def. Empty" },
];

const CLOSING_COLUMNS = [
  { field: "closing_good_filled", label: "Cl. Good Filled" },
  { field: "closing_good_empty", label: "Cl. Good Empty" },
  { field: "closing_defective_filled", label: "Cl. Def. Filled" },
  { field: "closing_defective_empty", label: "Cl. Def. Empty" },
] as const;

function AutoBadge({ source }: { source: string }) {
  return (
    <span
      title={`Auto-pulled from the ${source}`}
      className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-current">
        <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
      </svg>
      auto-pulled
    </span>
  );
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export const Route = createFileRoute("/registers/stock")({
  head: () => ({
    meta: [
      { title: "Daily Stock Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Record daily opening, receipts, issues and closing cylinder stock for every LPG package code.",
      },
      { property: "og:title", content: "Daily Stock Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Day-wise cylinder stock movement for every package code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    const session = await getSessionState();
    if (!session.authed) throw redirect({ to: "/" });
    if (!session.role) throw redirect({ to: "/role" });
    if (session.role !== "godown" && session.role !== "distributor") {
      throw redirect({ to: "/dashboard" });
    }
    return session;
  },
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Could not open the register</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md p-6 text-center text-muted-foreground">Not found</main>
  ),
  component: StockRegisterPage,
});

function StockRegisterPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const [stockDate, setStockDate] = useState(todayISO());
  const [filledBy, setFilledBy] = useState("");
  const [draft, setDraft] = useState<Record<string, Record<string, number>>>({});

  const fetchDay = useServerFn(getStockDay);
  const saveDay = useServerFn(saveStockEntries);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-day", stockDate],
    queryFn: () => fetchDay({ data: { stockDate } }),
  });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, Record<string, number>> = {};
    for (const row of data.rows) {
      next[row.package_code_id] = Object.fromEntries(
        EDITABLE_COLUMNS.map((c) => [c.field, row[c.field]]),
      );
    }
    setDraft(next);
    setFilledBy(data.rows.find((r) => r.filled_by)?.filled_by ?? "");
  }, [data]);

  const locked = data?.locked ?? false;
  const stockRowIds = (data?.rows ?? []).map((r) => r.id).filter((id): id is string => Boolean(id));

  const rows = useMemo(() => {
    if (!data) return [];
    return data.rows.map((row) => {
      const edits = draft[row.package_code_id] ?? {};
      const merged: StockInputs = { ...row, ...edits } as StockInputs;
      const tv = { tv_filled: row.tv_filled, tv_empty: row.tv_empty };
      return { ...row, ...merged, ...computeClosing(merged, tv) };
    });
  }, [data, draft]);

  const save = useMutation({
    mutationFn: () =>
      saveDay({
        data: {
          stockDate,
          filledBy: filledBy || null,
          rows: Object.entries(draft).map(([package_code_id, values]) => ({
            package_code_id,
            values,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Stock register saved");
      void refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setValue = (packageId: string, field: EditableField, raw: string) => {
    const value = raw === "" ? 0 : Math.max(0, Math.round(Number(raw)));
    setDraft((prev) => ({
      ...prev,
      [packageId]: { ...(prev[packageId] ?? {}), [field]: Number.isFinite(value) ? value : 0 },
    }));
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {session.agencyName}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              Daily Stock Register
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExportPdfButton register="stock" />
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="h-10 shrink-0 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,260px)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor="stock-date" className="text-sm font-medium text-foreground">
              Register date
            </label>
            <input
              id="stock-date"
              type="date"
              value={stockDate}
              onChange={(e) => setStockDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {locked ? (
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
                <span className="text-sm font-medium text-foreground">
                  This day is locked — entries are read-only.
                </span>
                {stockRowIds.length > 0 ? (
                  <>
                    <RequestEditButton
                      tableName="stock_entries"
                      entryId={stockRowIds[0]!}
                      coveredTable="stock_entries"
                      coveredIds={stockRowIds}
                      requestedBy={filledBy || null}
                      onUnlocked={() => void refetch()}
                    />
                    <EditedBadge tableName="stock_entries" entryId={stockRowIds[0]!} />
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <FilledBySelect
                roles={["godown", "distributor"]}
                value={filledBy}
                onChange={setFilledBy}
              />
              <button
                type="button"
                disabled={save.isPending || isLoading}
                onClick={() => save.mutate()}
                className="h-12 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save day"}
              </button>
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Opening balances carry forward automatically from the previous entry, and closing balances
          are calculated. Columns marked “auto-pulled” come live from the Sales, Connection/SV and
          Defective registers and cannot be typed here.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-max min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/70">
                <th className="sticky left-0 z-20 min-w-32 border-b border-r border-border bg-secondary px-3 py-3 text-left font-semibold text-foreground">
                  Package
                </th>
                {OPENING_COLUMNS.map((c) => (
                  <th
                    key={c.field}
                    className="min-w-28 border-b border-border px-3 py-3 text-left font-semibold text-muted-foreground"
                  >
                    {c.label}
                  </th>
                ))}
                {EDITABLE_COLUMNS.map((c) => (
                  <th
                    key={c.field}
                    className="min-w-32 border-b border-border px-3 py-2 text-left font-semibold text-foreground"
                  >
                    {c.label}
                  </th>
                ))}
                {AUTO_COLUMNS.map((c) => (
                  <th
                    key={c.field}
                    className="min-w-32 border-b border-border bg-primary/5 px-3 py-2 text-left font-semibold text-foreground"
                  >
                    <span className="block">{c.label}</span>
                    <AutoBadge source={c.source} />
                  </th>
                ))}
                {CLOSING_COLUMNS.map((c) => (
                  <th
                    key={c.field}
                    className="min-w-28 border-b border-border px-3 py-3 text-left font-semibold text-primary"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={18} className="px-3 py-6 text-center text-muted-foreground">
                    Loading register…
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.package_code_id} className="even:bg-muted/30">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left font-semibold text-foreground even:bg-card"
                  >
                    {row.package_code}
                  </th>
                  {OPENING_COLUMNS.map((c) => (
                    <td
                      key={c.field}
                      className="border-b border-border px-3 py-2 text-muted-foreground"
                    >
                      {row[c.field]}
                    </td>
                  ))}
                  {EDITABLE_COLUMNS.map((c) => (
                    <td key={c.field} className="border-b border-border px-2 py-1.5">
                      {locked ? (
                        <span className="px-1 text-foreground">{row[c.field]}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`${row.package_code} ${c.label}`}
                          value={draft[row.package_code_id]?.[c.field] ?? 0}
                          onChange={(e) => setValue(row.package_code_id, c.field, e.target.value)}
                          className="h-11 w-24 rounded-md border border-input bg-background px-2 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        />
                      )}
                    </td>
                  ))}
                  {AUTO_COLUMNS.map((c) => (
                    <td
                      key={c.field}
                      className="border-b border-border bg-primary/5 px-3 py-2 font-medium text-foreground"
                      aria-readonly
                      title={`Auto-pulled from the ${c.source}`}
                    >
                      {row[c.field]}
                    </td>
                  ))}
                  {CLOSING_COLUMNS.map((c) => (
                    <td
                      key={c.field}
                      className="border-b border-border px-3 py-2 font-semibold text-primary"
                    >
                      {row[c.field]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
