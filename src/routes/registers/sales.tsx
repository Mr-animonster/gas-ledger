import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { EditedBadge } from "@/components/EditedBadge";
import { RequestEditButton } from "@/components/RequestEditButton";
import { FilledBySelect } from "@/components/FilledBySelect";
import { getSessionState } from "@/lib/agency.functions";
import { getPackageCodes, searchConsumers } from "@/lib/reference.functions";
import { getSalesDayData, lockSalesDayFn, saveSalesBatchFn } from "@/lib/sales.functions";
import { batchTotal, computedAmount, isOverridden, type SaleItem } from "@/lib/sales-math";

type Consumer = {
  id: string;
  consumer_no: string;
  name: string;
  mobile_no: string | null;
  scheme: string;
};

type RowDraft = {
  id: string | null;
  cash_memo_no: number | null;
  consumer_id: string | null;
  consumer_no: string;
  consumer_name: string;
  package_code_id: string;
  item: SaleItem;
  quantity: number;
  rate: number;
  amount_charged: number;
  payment_mode: "Cash" | "UPI" | "Card";
  pdc_done: boolean;
};

const cellClass =
  "h-11 w-full rounded-md border border-input bg-background px-2 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:bg-muted disabled:text-muted-foreground";

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function makeRow(rate: number, packageCodeId = ""): RowDraft {
  return {
    id: null,
    cash_memo_no: null,
    consumer_id: null,
    consumer_no: "",
    consumer_name: "",
    package_code_id: packageCodeId,
    item: "Refill",
    quantity: 1,
    rate,
    amount_charged: rate,
    payment_mode: "Cash",
    pdc_done: false,
  };
}

export const Route = createFileRoute("/registers/sales")({
  head: () => ({
    meta: [
      { title: "Sales Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Fast batch entry of daily LPG cash memos: consumer lookup, rates, payment mode, PDC and one booklet page photo per batch.",
      },
      { property: "og:title", content: "Sales Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Spreadsheet-style quick entry grid for up to 200 cash memos a day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    const session = await getSessionState();
    if (!session.authed) throw redirect({ to: "/" });
    if (!session.role) throw redirect({ to: "/role" });
    if (session.role !== "computer_staff" && session.role !== "distributor") {
      throw redirect({ to: "/dashboard" });
    }
    return session;
  },
  component: SalesRegisterPage,
});

function ConsumerCell({
  row,
  disabled,
  onPick,
  onType,
  inputProps,
}: {
  row: RowDraft;
  disabled: boolean;
  onPick: (c: Consumer) => void;
  onType: (value: string) => void;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const runSearch = useServerFn(searchConsumers);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(row.consumer_no.trim()), 200);
    return () => clearTimeout(t);
  }, [row.consumer_no]);

  const { data } = useQuery({
    queryKey: ["consumer-search", debounced],
    queryFn: () => runSearch({ data: { term: debounced } }),
    enabled: open && debounced.length >= 2 && !row.consumer_id,
    staleTime: 30_000,
  });

  const results = (data ?? []) as Consumer[];

  return (
    <div className="relative">
      <input
        {...inputProps}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={row.consumer_no}
        placeholder="Consumer no. / name"
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cellClass}
      />
      {open && !row.consumer_id && results.length > 0 ? (
        <ul className="absolute z-40 mt-1 max-h-64 w-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="w-full border-b border-border/60 px-3 py-2 text-left last:border-0 hover:bg-accent"
              >
                <span className="block text-sm font-medium text-foreground">{c.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {c.consumer_no} · {c.scheme}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SalesRegisterPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();

  const fetchDay = useServerFn(getSalesDayData);
  const persist = useServerFn(saveSalesBatchFn);
  const lockDay = useServerFn(lockSalesDayFn);

  const [date, setDate] = useState(todayISO());
  const [batchId, setBatchId] = useState<string | null>(null);
  const [issuedBy, setIssuedBy] = useState("");
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const day = useQuery({
    queryKey: ["sales-day", date],
    queryFn: () => fetchDay({ data: { date } }),
  });

  const fetchPackages = useServerFn(getPackageCodes);
  const packagesQuery = useQuery({
    queryKey: ["package-codes"],
    queryFn: () => fetchPackages({ data: undefined }),
    staleTime: 5 * 60_000,
  });
  const packageCodes = packagesQuery.data ?? [];
  // Default cylinder for a refill row: the agency's standard 14 Kg package.
  const defaultPackageId =
    packageCodes.find((p) => p.code === "14 Kg")?.id ?? packageCodes[0]?.id ?? "";

  const rates = day.data?.standardRates ?? { Refill: 0, "ARB-Other": 0 };

  const currentBatch = day.data?.batches.find((b) => b.id === batchId) ?? null;
  const locked = Boolean(currentBatch?.locked);
  const canEdit = !locked;

  // Start a fresh batch whenever the date changes and nothing is selected.
  useEffect(() => {
    setBatchId(null);
    setRows([]);
    setPhotoDataUrl(null);
    setPhotoName("");
  }, [date]);

  useEffect(() => {
    if (rows.length === 0 && day.data && !batchId) {
      setRows([makeRow(day.data.standardRates.Refill, defaultPackageId)]);
    }
  }, [day.data, batchId, rows.length, defaultPackageId]);

  const total = useMemo(() => batchTotal(rows), [rows]);

  const setRow = (index: number, patch: Partial<RowDraft>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addRow = () => {
    setRows((prev) => [...prev, makeRow(rates.Refill, defaultPackageId)]);
    requestAnimationFrame(() => {
      const inputs = gridRef.current?.querySelectorAll<HTMLInputElement>('[data-col="consumer"]');
      inputs?.[inputs.length - 1]?.focus();
    });
  };

  const focusCell = (rowIndex: number, col: string) => {
    const el = gridRef.current?.querySelector<HTMLElement>(
      `[data-row="${rowIndex}"][data-col="${col}"]`,
    );
    el?.focus();
    if (el instanceof HTMLInputElement) el.select();
  };

  const onCellKeyDown = (e: React.KeyboardEvent<HTMLElement>, rowIndex: number, col: string) => {
    if (e.key === "ArrowDown" || (e.key === "Enter" && col !== "consumer")) {
      e.preventDefault();
      if (rowIndex === rows.length - 1) addRow();
      else focusCell(rowIndex + 1, col);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(rowIndex - 1, col);
    }
  };

  const loadBatch = (id: string) => {
    const batch = day.data?.batches.find((b) => b.id === id);
    if (!batch) return;
    setBatchId(id);
    setIssuedBy(batch.issued_by ?? "");
    setPhotoDataUrl(null);
    setPhotoName("");
    setRows(
      batch.entries.map((e) => ({
        id: e.id,
        cash_memo_no: e.cash_memo_no,
        consumer_id: e.consumer_id,
        consumer_no: e.consumer_no ?? "",
        consumer_name: e.consumer_name ?? "",
        package_code_id: e.package_code_id ?? defaultPackageId,
        item: e.item,
        quantity: e.quantity,
        rate: e.rate,
        amount_charged: e.amount_charged,
        payment_mode: e.payment_mode,
        pdc_done: e.pdc_done,
      })),
    );
  };

  const startNewBatch = () => {
    setBatchId(null);
    setPhotoDataUrl(null);
    setPhotoName("");
    setRows([makeRow(rates.Refill, defaultPackageId)]);
  };

  const readPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(String(reader.result));
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const save = useMutation({
    mutationFn: (lock: boolean) =>
      persist({
        data: {
          batchId,
          date,
          issued_by: issuedBy || null,
          rows: rows.map((r) => ({
            id: r.id,
            consumer_id: r.consumer_id,
            consumer_no: r.consumer_no || null,
            consumer_name: r.consumer_name || null,
            package_code_id: r.package_code_id || null,
            item: r.item,
            quantity: Math.max(0, Math.round(r.quantity) || 0),
            rate: Number(r.rate) || 0,
            amount_charged: Number(r.amount_charged) || 0,
            payment_mode: r.payment_mode,
            pdc_done: r.pdc_done,
          })),
          photoDataUrl,
          lock,
        },
      }),
    onSuccess: (result, lock) => {
      toast.success(lock ? "Batch submitted and locked" : "Batch saved");
      setPhotoDataUrl(null);
      setPhotoName("");
      setBatchId(result.batchId);
      const saved = result.day.batches.find((b) => b.id === result.batchId);
      if (saved) {
        setRows(
          saved.entries.map((e) => ({
            id: e.id,
            cash_memo_no: e.cash_memo_no,
            consumer_id: e.consumer_id,
            consumer_no: e.consumer_no ?? "",
            consumer_name: e.consumer_name ?? "",
            package_code_id: e.package_code_id ?? defaultPackageId,
            item: e.item,
            quantity: e.quantity,
            rate: e.rate,
            amount_charged: e.amount_charged,
            payment_mode: e.payment_mode,
            pdc_done: e.pdc_done,
          })),
        );
      }
      void day.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitBatch = () => {
    if (!currentBatch?.booklet_page_photo_ref && !photoDataUrl) {
      toast.error("Upload the booklet page photo for this batch before submitting.");
      return;
    }
    save.mutate(true);
  };

  const lockAll = useMutation({
    mutationFn: () => lockDay({ data: { date } }),
    onSuccess: () => {
      toast.success("Day locked");
      void day.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {session.agencyName}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              Sales Register
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-10 shrink-0 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5">
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="sale-date" className="text-sm font-medium text-foreground">
              Date
            </label>
            <input
              id="sale-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <FilledBySelect
            roles={["computer_staff", "distributor"]}
            value={issuedBy}
            onChange={setIssuedBy}
            label="Issued By"
          />
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Standard rates</span>
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              Refill ₹{rates.Refill} · ARB-Other ₹{rates["ARB-Other"]}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Batch total</span>
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-base font-semibold text-foreground">
              ₹{total.toFixed(2)} · {rows.length} memos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startNewBatch}
            className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            + New batch (booklet page)
          </button>
          {(day.data?.batches ?? []).map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => loadBatch(b.id)}
              className={`h-11 rounded-lg border border-input px-3 text-sm font-medium text-foreground hover:bg-secondary ${
                batchId === b.id ? "bg-secondary" : "bg-background"
              }`}
            >
              Page {i + 1} · {b.entries.length} memos {b.locked ? "🔒" : ""}
            </button>
          ))}
        </div>

        {locked ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
            <span className="text-sm font-medium text-foreground">
              This batch is submitted and locked — read-only.
            </span>
            {currentBatch ? (
              <>
                <RequestEditButton
                  tableName="sales_batches"
                  entryId={currentBatch.id}
                  coveredTable="sales_entries"
                  coveredIds={currentBatch.entries.map((e) => e.id)}
                  onUnlocked={() => void day.refetch()}
                />
                <EditedBadge tableName="sales_batches" entryId={currentBatch.id} />
              </>
            ) : null}
          </div>
        ) : null}

        <div ref={gridRef} className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/60 text-left">
                <th className="sticky left-0 z-20 w-28 bg-secondary/95 px-3 py-2 font-semibold">
                  Cash Memo
                </th>
                <th className="w-56 px-2 py-2 font-semibold">Consumer</th>
                <th className="w-48 px-2 py-2 font-semibold">Name</th>
                <th className="w-32 px-2 py-2 font-semibold">Item</th>
                <th className="w-32 px-2 py-2 font-semibold">Package</th>
                <th className="w-20 px-2 py-2 font-semibold">Qty</th>
                <th className="w-28 px-2 py-2 font-semibold">Rate</th>
                <th className="w-32 px-2 py-2 font-semibold">Amount</th>
                <th className="w-28 px-2 py-2 font-semibold">Payment</th>
                <th className="w-20 px-2 py-2 font-semibold">PDC</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const override = isOverridden(row);
                return (
                  <tr key={row.id ?? `new-${index}`} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-mono text-sm text-muted-foreground">
                      {row.cash_memo_no ?? "auto"}
                    </td>
                    <td className="px-2 py-1.5">
                      <ConsumerCell
                        row={row}
                        disabled={!canEdit}
                        inputProps={
                          {
                            "data-row": index,
                            "data-col": "consumer",
                            onKeyDown: (e) => onCellKeyDown(e, index, "consumer"),
                          } as React.InputHTMLAttributes<HTMLInputElement>
                        }
                        onType={(value) =>
                          setRow(index, {
                            consumer_no: value,
                            consumer_id: null,
                            consumer_name: "",
                          })
                        }
                        onPick={(c) =>
                          setRow(index, {
                            consumer_id: c.id,
                            consumer_no: c.consumer_no,
                            consumer_name: c.name,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        data-row={index}
                        data-col="name"
                        disabled={!canEdit}
                        value={row.consumer_name}
                        onChange={(e) => setRow(index, { consumer_name: e.target.value })}
                        onKeyDown={(e) => onCellKeyDown(e, index, "name")}
                        className={cellClass}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        data-row={index}
                        data-col="item"
                        disabled={!canEdit}
                        value={row.item}
                        onChange={(e) => {
                          const item = e.target.value as SaleItem;
                          const rate = rates[item] ?? 0;
                          setRow(index, {
                            item,
                            rate,
                            amount_charged: computedAmount({ quantity: row.quantity, rate }),
                          });
                        }}
                        onKeyDown={(e) => onCellKeyDown(e, index, "item")}
                        className={cellClass}
                      >
                        <option value="Refill">Refill</option>
                        <option value="ARB-Other">ARB-Other</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        data-row={index}
                        data-col="package"
                        aria-label="Cylinder package"
                        disabled={!canEdit}
                        value={row.package_code_id}
                        onChange={(e) => setRow(index, { package_code_id: e.target.value })}
                        className={cellClass}
                      >
                        <option value="">—</option>
                        {packageCodes.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.code}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        data-row={index}
                        data-col="quantity"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        disabled={!canEdit}
                        value={row.quantity}
                        onChange={(e) => {
                          const quantity = Math.max(0, Math.round(Number(e.target.value)) || 0);
                          setRow(index, {
                            quantity,
                            amount_charged: computedAmount({ quantity, rate: row.rate }),
                          });
                        }}
                        onKeyDown={(e) => onCellKeyDown(e, index, "quantity")}
                        className={cellClass}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        data-row={index}
                        data-col="rate"
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        disabled={!canEdit}
                        value={row.rate}
                        onChange={(e) => {
                          const rate = Number(e.target.value) || 0;
                          setRow(index, {
                            rate,
                            amount_charged: computedAmount({ quantity: row.quantity, rate }),
                          });
                        }}
                        onKeyDown={(e) => onCellKeyDown(e, index, "rate")}
                        className={cellClass}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        data-row={index}
                        data-col="amount"
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        disabled={!canEdit}
                        value={row.amount_charged}
                        onChange={(e) =>
                          setRow(index, { amount_charged: Number(e.target.value) || 0 })
                        }
                        onKeyDown={(e) => onCellKeyDown(e, index, "amount")}
                        className={`${cellClass} ${
                          override ? "border-destructive bg-destructive/10 font-semibold" : ""
                        }`}
                        title={
                          override
                            ? `Overridden — computed ₹${computedAmount(row).toFixed(2)}`
                            : undefined
                        }
                      />
                      {override ? (
                        <span className="mt-0.5 block text-xs font-medium text-destructive">
                          ≠ ₹{computedAmount(row).toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        data-row={index}
                        data-col="payment"
                        disabled={!canEdit}
                        value={row.payment_mode}
                        onChange={(e) =>
                          setRow(index, {
                            payment_mode: e.target.value as RowDraft["payment_mode"],
                          })
                        }
                        onKeyDown={(e) => onCellKeyDown(e, index, "payment")}
                        className={cellClass}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        data-row={index}
                        data-col="pdc"
                        type="checkbox"
                        aria-label="PDC done at doorstep"
                        disabled={!canEdit}
                        checked={row.pdc_done}
                        onChange={(e) => setRow(index, { pdc_done: e.target.checked })}
                        onKeyDown={(e) => onCellKeyDown(e, index, "pdc")}
                        className="size-6 accent-primary"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {canEdit ? (
                        <button
                          type="button"
                          aria-label={`Remove row ${index + 1}`}
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                          className="h-9 w-9 rounded-md text-muted-foreground hover:bg-secondary"
                        >
                          ×
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Cash memo numbers are generated automatically and are never reused. Tab moves across a
          row; ↑ / ↓ (or Enter) moves down a column and adds a new row at the end.
        </p>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Booklet page photo (one per batch)
            </span>
            {currentBatch?.photo_url ? (
              <a
                href={currentBatch.photo_url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm font-medium text-primary underline"
              >
                View uploaded page photo
              </a>
            ) : null}
            {canEdit ? (
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readPhoto(file);
                }}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:h-11 file:rounded-lg file:border file:border-input file:bg-background file:px-4 file:text-sm file:font-medium file:text-foreground"
              />
            ) : null}
            {photoName ? (
              <p className="text-xs text-muted-foreground">Ready to upload: {photoName}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={addRow}
              disabled={!canEdit}
              className="h-12 rounded-lg border border-input bg-background px-4 text-base font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              + Add Row
            </button>
            <button
              type="button"
              onClick={() => save.mutate(false)}
              disabled={!canEdit || save.isPending}
              className="h-12 rounded-lg border border-input bg-background px-4 text-base font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={submitBatch}
              disabled={!canEdit || save.isPending}
              className="h-12 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              Submit Batch
            </button>
            <button
              type="button"
              onClick={() => lockAll.mutate()}
              disabled={lockAll.isPending || (day.data?.batches.length ?? 0) === 0}
              className="h-12 rounded-lg border border-input bg-background px-4 text-base font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Lock day
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
