import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { EditedBadge } from "@/components/EditedBadge";
import { RequestEditButton } from "@/components/RequestEditButton";
import { FilledBySelect } from "@/components/FilledBySelect";
import { getSessionState } from "@/lib/agency.functions";
import { getPackageCodes } from "@/lib/reference.functions";
import { getSqc, getSqcTolerance, listSqc, saveSqc } from "@/lib/sqc.functions";
import { computeVariation, requiredSampleCount, withinTolerance } from "@/lib/sqc-math";
import { ExportPdfButton } from "@/components/ExportPdfButton";

type LineDraft = {
  cylinder_type_id: string;
  tare_weight: number;
  gross_weight: number;
  observed_weight: number;
  dpt_date: string;
  sealing_condition: "OK" | "Damaged";
  leaky_body_bung: "None" | "Body" | "Bung";
  remarks: string;
};

type HeaderDraft = {
  invoice_no: string;
  invoice_date: string;
  transporter: string;
  truck_no: string;
  coming_from: string;
  received_date: string;
  total_cylinders: number;
  godown_keeper_signature: string;
  proprietor_partner_signature: string;
};

function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function emptyLine(): LineDraft {
  return {
    cylinder_type_id: "",
    tare_weight: 0,
    gross_weight: 0,
    observed_weight: 0,
    dpt_date: "",
    sealing_condition: "OK",
    leaky_body_bung: "None",
    remarks: "",
  };
}

function emptyHeader(): HeaderDraft {
  return {
    invoice_no: "",
    invoice_date: todayISO(),
    transporter: "",
    truck_no: "",
    coming_from: "",
    received_date: todayISO(),
    total_cylinders: 0,
    godown_keeper_signature: "",
    proprietor_partner_signature: "",
  };
}

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export const Route = createFileRoute("/registers/sqc")({
  head: () => ({
    meta: [
      { title: "SQC Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Log truck-receipt statutory quality checks: sampled cylinder weights, variation, seal condition and retest dates.",
      },
      { property: "og:title", content: "SQC Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Per-truck sampling, weight variation and seal condition checks.",
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
  component: SqcRegisterPage,
});

function SqcRegisterPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();

  const fetchList = useServerFn(listSqc);
  const fetchEntry = useServerFn(getSqc);
  const fetchTolerance = useServerFn(getSqcTolerance);
  const fetchPackages = useServerFn(getPackageCodes);
  const persist = useServerFn(saveSqc);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderDraft>(emptyHeader);
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [filledBy, setFilledBy] = useState("");
  const [locked, setLocked] = useState(false);

  const list = useQuery({ queryKey: ["sqc-list"], queryFn: () => fetchList({ data: undefined }) });
  const packages = useQuery({
    queryKey: ["package-codes"],
    queryFn: () => fetchPackages({ data: undefined }),
    staleTime: 5 * 60_000,
  });
  const tolerance = useQuery({
    queryKey: ["sqc-tolerance"],
    queryFn: () => fetchTolerance({ data: undefined }),
    staleTime: 5 * 60_000,
  });
  const entry = useQuery({
    queryKey: ["sqc-entry", selectedId],
    queryFn: () => fetchEntry({ data: { id: selectedId! } }),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    const loaded = entry.data;
    if (!loaded || !selectedId) return;
    setHeader({
      invoice_no: loaded.entry.invoice_no ?? "",
      invoice_date: loaded.entry.invoice_date ?? "",
      transporter: loaded.entry.transporter ?? "",
      truck_no: loaded.entry.truck_no ?? "",
      coming_from: loaded.entry.coming_from ?? "",
      received_date: loaded.entry.received_date ?? todayISO(),
      total_cylinders: loaded.entry.total_cylinders ?? 0,
      godown_keeper_signature: loaded.entry.godown_keeper_signature ?? "",
      proprietor_partner_signature: loaded.entry.proprietor_partner_signature ?? "",
    });
    setFilledBy(loaded.entry.filled_by ?? "");
    setLocked(loaded.entry.locked);
    setLines(
      loaded.items.length > 0
        ? loaded.items.map((item) => ({
            cylinder_type_id: item.cylinder_type_id ?? "",
            tare_weight: item.tare_weight,
            gross_weight: item.gross_weight,
            observed_weight: item.observed_weight,
            dpt_date: item.dpt_date ?? "",
            sealing_condition: item.sealing_condition,
            leaky_body_bung: item.leaky_body_bung,
            remarks: item.remarks ?? "",
          }))
        : [emptyLine()],
    );
  }, [entry.data, selectedId]);

  const toleranceGrams = tolerance.data?.toleranceGrams ?? 10;
  const requiredSamples = requiredSampleCount(header.total_cylinders);

  const computedLines = useMemo(
    () =>
      lines.map((line) => {
        const variation = computeVariation(line);
        return { ...line, variation, ok: withinTolerance(variation, toleranceGrams) };
      }),
    [lines, toleranceGrams],
  );

  const save = useMutation({
    mutationFn: (lock: boolean) =>
      persist({
        data: {
          id: selectedId,
          header: {
            invoice_no: header.invoice_no.trim(),
            invoice_date: header.invoice_date || null,
            transporter: header.transporter || null,
            truck_no: header.truck_no || null,
            coming_from: header.coming_from || null,
            received_date: header.received_date,
            total_cylinders: Math.max(0, Math.round(header.total_cylinders) || 0),
            godown_keeper_signature: header.godown_keeper_signature || null,
            proprietor_partner_signature: header.proprietor_partner_signature || null,
            filled_by: filledBy || null,
          },
          items: lines.map((line, index) => ({
            s_no: index + 1,
            cylinder_type_id: line.cylinder_type_id || null,
            tare_weight: Number(line.tare_weight) || 0,
            gross_weight: Number(line.gross_weight) || 0,
            observed_weight: Number(line.observed_weight) || 0,
            dpt_date: line.dpt_date || null,
            sealing_condition: line.sealing_condition,
            leaky_body_bung: line.leaky_body_bung,
            remarks: line.remarks || null,
          })),
          lock,
        },
      }),
    onSuccess: (result, lock) => {
      setSelectedId(result.entry.id);
      setLocked(result.entry.locked);
      toast.success(lock ? "Truck entry submitted and locked" : "Truck entry saved");
      void list.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startNew = () => {
    setSelectedId(null);
    setHeader(emptyHeader());
    setLines([emptyLine()]);
    setFilledBy("");
    setLocked(false);
  };

  const setLine = <K extends keyof LineDraft>(index: number, field: K, value: LineDraft[K]) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));

  const canEdit = !locked;

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {session.agencyName}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              SQC Register
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExportPdfButton register="sqc" />
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

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <button
            type="button"
            onClick={startNew}
            className="h-12 w-full rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground"
          >
            + New truck entry
          </button>
          <div className="rounded-xl border border-border bg-card">
            <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent arrivals
            </p>
            <ul className="max-h-80 overflow-y-auto">
              {(list.data ?? []).map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`flex w-full flex-col gap-0.5 border-b border-border px-3 py-3 text-left hover:bg-secondary ${
                      selectedId === row.id ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {row.invoice_no} {row.locked ? "🔒" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.received_date} · {row.truck_no || "No truck no."}
                    </span>
                  </button>
                </li>
              ))}
              {list.data && list.data.length === 0 ? (
                <li className="px-3 py-4 text-sm text-muted-foreground">No entries yet.</li>
              ) : null}
            </ul>
          </div>
        </aside>

        <section className="space-y-5">
          {locked ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
              <span className="text-sm font-medium text-foreground">
                This truck entry is submitted and locked — read-only.
              </span>
              {selectedId ? (
                <>
                  <RequestEditButton
                    tableName="sqc_entries"
                    entryId={selectedId}
                    requestedBy={filledBy || null}
                    onUnlocked={() => {
                      setLocked(false);
                      void list.refetch();
                    }}
                  />
                  <EditedBadge tableName="sqc_entries" entryId={selectedId} />
                </>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">Consignment details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["invoice_no", "Invoice No.", "text"],
                  ["invoice_date", "Invoice Date", "date"],
                  ["transporter", "Transporter", "text"],
                  ["truck_no", "Truck No.", "text"],
                  ["coming_from", "Coming From", "text"],
                  ["received_date", "Received Date", "date"],
                ] as const
              ).map(([field, label, type]) => (
                <div key={field} className="space-y-1.5">
                  <label htmlFor={field} className="text-sm font-medium text-foreground">
                    {label}
                  </label>
                  <input
                    id={field}
                    type={type}
                    disabled={!canEdit}
                    value={header[field] as string}
                    onChange={(e) => setHeader((h) => ({ ...h, [field]: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label htmlFor="total_cylinders" className="text-sm font-medium text-foreground">
                  Total cylinders in consignment
                </label>
                <input
                  id="total_cylinders"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={header.total_cylinders}
                  onChange={(e) =>
                    setHeader((h) => ({
                      ...h,
                      total_cylinders: Math.max(0, Math.round(Number(e.target.value)) || 0),
                    }))
                  }
                  className={inputClass}
                />
              </div>
              {canEdit ? (
                <FilledBySelect
                  roles={["godown", "distributor"]}
                  value={filledBy}
                  onChange={setFilledBy}
                />
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Total cylinders" value={String(header.total_cylinders)} />
              <SummaryTile
                label="To be sampled (10%)"
                value={String(requiredSamples)}
                hint={`${computedLines.length} entered`}
              />
              <SummaryTile label="Tolerance" value={`± ${toleranceGrams} g`} hint="configurable" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">Sampled cylinders</h2>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                  className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  + Add cylinder
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-max min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/70">
                    <th className="sticky left-0 z-20 min-w-14 border-b border-r border-border bg-secondary px-3 py-3 text-left font-semibold text-foreground">
                      S.No
                    </th>
                    {[
                      "Cylinder Type",
                      "Tare (kg)",
                      "Gross (kg)",
                      "Observed (kg)",
                      "Variation (kg)",
                      "Limit",
                      "DPT Date",
                      "Sealing",
                      "Leaky Body/Bung",
                      "Remarks",
                      "",
                    ].map((label, i) => (
                      <th
                        key={`${label}-${i}`}
                        className="min-w-32 border-b border-border px-3 py-3 text-left font-semibold text-foreground"
                      >
                        {label === "DPT Date" ? (
                          <span className="block">
                            DPT Date
                            <span className="block text-[11px] font-normal text-muted-foreground">
                              Due date for statutory PRS retest
                            </span>
                          </span>
                        ) : (
                          label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computedLines.map((line, index) => (
                    <tr key={index} className="even:bg-muted/30">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left font-semibold text-foreground"
                      >
                        {index + 1}
                      </th>
                      <td className="border-b border-border px-2 py-1.5">
                        {canEdit ? (
                          <select
                            aria-label={`Cylinder type row ${index + 1}`}
                            value={line.cylinder_type_id}
                            onChange={(e) => setLine(index, "cylinder_type_id", e.target.value)}
                            className="h-11 w-36 rounded-md border border-input bg-background px-2 text-base text-foreground"
                          >
                            <option value="">Select</option>
                            {(packages.data ?? []).map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.code}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-1">
                            {(packages.data ?? []).find((p) => p.id === line.cylinder_type_id)
                              ?.code ?? "—"}
                          </span>
                        )}
                      </td>
                      {(["tare_weight", "gross_weight", "observed_weight"] as const).map(
                        (field) => (
                          <td key={field} className="border-b border-border px-2 py-1.5">
                            {canEdit ? (
                              <input
                                type="number"
                                step="0.001"
                                inputMode="decimal"
                                aria-label={`${field} row ${index + 1}`}
                                value={line[field]}
                                onChange={(e) => setLine(index, field, Number(e.target.value) || 0)}
                                className="h-11 w-28 rounded-md border border-input bg-background px-2 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                              />
                            ) : (
                              <span className="px-1">{line[field]}</span>
                            )}
                          </td>
                        ),
                      )}
                      <td className="border-b border-border px-3 py-2 font-semibold text-primary">
                        {line.variation.toFixed(3)}
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            line.ok
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {line.ok ? "Within limit" : "Out of limit"}
                        </span>
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        {canEdit ? (
                          <input
                            type="date"
                            aria-label={`DPT date row ${index + 1}`}
                            value={line.dpt_date}
                            onChange={(e) => setLine(index, "dpt_date", e.target.value)}
                            className="h-11 w-40 rounded-md border border-input bg-background px-2 text-base text-foreground"
                          />
                        ) : (
                          <span className="px-1">{line.dpt_date || "—"}</span>
                        )}
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        {canEdit ? (
                          <select
                            aria-label={`Sealing condition row ${index + 1}`}
                            value={line.sealing_condition}
                            onChange={(e) =>
                              setLine(
                                index,
                                "sealing_condition",
                                e.target.value as LineDraft["sealing_condition"],
                              )
                            }
                            className="h-11 w-32 rounded-md border border-input bg-background px-2 text-base text-foreground"
                          >
                            <option value="OK">OK</option>
                            <option value="Damaged">Damaged</option>
                          </select>
                        ) : (
                          <span className="px-1">{line.sealing_condition}</span>
                        )}
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        {canEdit ? (
                          <select
                            aria-label={`Leaky body or bung row ${index + 1}`}
                            value={line.leaky_body_bung}
                            onChange={(e) =>
                              setLine(
                                index,
                                "leaky_body_bung",
                                e.target.value as LineDraft["leaky_body_bung"],
                              )
                            }
                            className="h-11 w-32 rounded-md border border-input bg-background px-2 text-base text-foreground"
                          >
                            <option value="None">None</option>
                            <option value="Body">Body</option>
                            <option value="Bung">Bung</option>
                          </select>
                        ) : (
                          <span className="px-1">{line.leaky_body_bung}</span>
                        )}
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        {canEdit ? (
                          <input
                            type="text"
                            aria-label={`Remarks row ${index + 1}`}
                            value={line.remarks}
                            onChange={(e) => setLine(index, "remarks", e.target.value)}
                            className="h-11 w-48 rounded-md border border-input bg-background px-2 text-base text-foreground"
                          />
                        ) : (
                          <span className="px-1">{line.remarks || "—"}</span>
                        )}
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        {canEdit && computedLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                            className="h-11 rounded-md border border-input px-3 text-sm font-medium text-destructive hover:bg-secondary"
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">Signatures</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Typed names for now — digital signature capture may be added later.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["godown_keeper_signature", "Godown Keeper"],
                  ["proprietor_partner_signature", "Proprietor / Partner"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1.5">
                  <label htmlFor={field} className="text-sm font-medium text-foreground">
                    {label}
                  </label>
                  <input
                    id={field}
                    type="text"
                    disabled={!canEdit}
                    value={header[field]}
                    onChange={(e) => setHeader((h) => ({ ...h, [field]: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={save.isPending || !header.invoice_no.trim()}
                onClick={() => save.mutate(false)}
                className="h-12 rounded-lg border border-input bg-background px-6 text-base font-semibold text-foreground disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={save.isPending || !header.invoice_no.trim()}
                onClick={() => {
                  if (computedLines.length < requiredSamples) {
                    toast.error(`Sample at least ${requiredSamples} cylinders before submitting.`);
                    return;
                  }
                  save.mutate(true);
                }}
                className="h-12 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground disabled:opacity-60"
              >
                Submit &amp; lock
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
