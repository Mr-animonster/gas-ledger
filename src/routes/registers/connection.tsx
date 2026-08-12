import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getSessionState } from "@/lib/agency.functions";
import { listCashMemos, listConnections, saveConnection } from "@/lib/connection.functions";
import { getPackageCodes } from "@/lib/reference.functions";
import { last4, maskedDisplay } from "@/lib/connection-mask";
import { ConsumerSearch, type Consumer } from "@/components/ConsumerSearch";
import { FilledBySelect } from "@/components/FilledBySelect";

export const Route = createFileRoute("/registers/connection")({
  head: () => ({
    meta: [
      { title: "Connection/SV Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Record new LPG connections, reconnections, additional DBC connections and terminations with eligibility and duplicate-household checks.",
      },
      { property: "og:title", content: "Connection/SV Register — LPG Register Book" },
      {
        property: "og:description",
        content: "New connections, reconnections, DBC and TV terminations in one register.",
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
  component: ConnectionRegisterPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type ConnType = "New" | "Reconnection" | "Additional" | "TV";
type Scheme = "Regular" | "PMUY" | "Extended PMUY" | "PMUY-2";
type Tv = "Filled" | "Empty" | "N/A";

const connTypes: ConnType[] = ["New", "Reconnection", "Additional", "TV"];
const schemes: Scheme[] = ["Regular", "PMUY", "Extended PMUY", "PMUY-2"];

type FormState = {
  entry_date: string;
  type: ConnType;
  consumer: Consumer | null;
  consumer_no: string;
  consumer_name: string;
  scheme: Scheme;
  aadhaar_last4: string;
  bank_ac_last4: string;
  eligibility_check_done: boolean;
  duplicate_household_check_done: boolean;
  cylinder_dpr_type_id: string;
  cylinder_dpr_count: string;
  filled_empty_at_tv_retrieval: Tv;
  cash_memo_no: string;
};

const emptyForm = (): FormState => ({
  entry_date: today(),
  type: "New",
  consumer: null,
  consumer_no: "",
  consumer_name: "",
  scheme: "Regular",
  aadhaar_last4: "",
  bank_ac_last4: "",
  eligibility_check_done: false,
  duplicate_household_check_done: false,
  cylinder_dpr_type_id: "",
  cylinder_dpr_count: "1",
  filled_empty_at_tv_retrieval: "N/A",
  cash_memo_no: "",
});

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-input bg-background px-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-primary"
      />
      <span className="text-base text-foreground">{label}</span>
    </label>
  );
}

function ConnectionRegisterPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listConnections);
  const fetchMemos = useServerFn(listCashMemos);
  const fetchPackages = useServerFn(getPackageCodes);
  const save = useServerFn(saveConnection);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [processedBy, setProcessedBy] = useState("");
  const [busy, setBusy] = useState(false);

  const editedIds = useEditedIds("connection_sv_entries");

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["connection-entries"],
    queryFn: () => fetchList({}),
  });
  const { data: memos = [] } = useQuery({
    queryKey: ["cash-memos"],
    queryFn: () => fetchMemos({}),
  });
  const { data: packages = [] } = useQuery({
    queryKey: ["package-codes"],
    queryFn: () => fetchPackages({ data: undefined }),
    staleTime: 5 * 60_000,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onConsumerSelect(consumer: Consumer | null) {
    if (!consumer) {
      setForm((prev) => ({ ...prev, consumer: null }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      consumer,
      consumer_no: consumer.consumer_no,
      consumer_name: consumer.name,
      scheme: (schemes as string[]).includes(consumer.scheme)
        ? (consumer.scheme as Scheme)
        : prev.scheme,
    }));
  }

  const isTv = form.type === "TV";
  const checksMissing =
    form.type === "New" &&
    (!form.eligibility_check_done || !form.duplicate_household_check_done);

  async function submit(lock: boolean) {
    if (!form.consumer_no.trim() && !form.consumer_name.trim()) {
      toast.error("Select or enter a consumer first.");
      return;
    }
    setBusy(true);
    try {
      const result = await save({
        data: {
          id: null,
          lock,
          entry: {
            entry_date: form.entry_date,
            type: form.type,
            consumer_id: form.consumer?.id ?? null,
            consumer_no: form.consumer_no.trim() || null,
            consumer_name: form.consumer_name.trim() || null,
            scheme: form.scheme,
            aadhaar_last4: form.aadhaar_last4 || null,
            bank_ac_last4: form.bank_ac_last4 || null,
            eligibility_check_done: form.eligibility_check_done,
            duplicate_household_check_done: form.duplicate_household_check_done,
            cylinder_dpr_type_id: form.cylinder_dpr_type_id || null,
            cylinder_dpr_count: Number(form.cylinder_dpr_count) || 0,
            filled_empty_at_tv_retrieval: isTv ? form.filled_empty_at_tv_retrieval : "N/A",
            cash_memo_no: form.cash_memo_no ? Number(form.cash_memo_no) : null,
            processed_by: processedBy || null,
          },
        },
      });
      toast.success(
        lock ? `Entry #${result.sr_no ?? ""} submitted and locked` : "Draft saved",
      );
      setForm(emptyForm());
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this entry.");
    } finally {
      setBusy(false);
    }
  }

  const packageName = (id: string | null) =>
    packages.find((p) => p.id === id)?.code ?? "—";

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Register
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Connection / SV Register
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Back
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => set("entry_date", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as ConnType)}
                className={inputClass}
              >
                {connTypes.map((t) => (
                  <option key={t} value={t}>
                    {t === "Additional" ? "Additional (DBC)" : t === "TV" ? "Termination (TV)" : t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <ConsumerSearch value={form.consumer} onSelect={onConsumerSelect} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Consumer No.">
              <input
                type="text"
                value={form.consumer_no}
                onChange={(e) => set("consumer_no", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Name">
              <input
                type="text"
                value={form.consumer_name}
                onChange={(e) => set("consumer_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Scheme">
              <select
                value={form.scheme}
                onChange={(e) => set("scheme", e.target.value as Scheme)}
                className={inputClass}
              >
                {schemes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Aadhaar (last 4 only)"
              hint={`Stored as ${maskedDisplay(form.aadhaar_last4 || null)} — earlier digits are never saved.`}
            >
              <input
                type="text"
                inputMode="numeric"
                value={form.aadhaar_last4}
                placeholder="1234"
                onChange={(e) => set("aadhaar_last4", last4(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field
              label="Bank A/C (last 4 only)"
              hint={`Stored as ${maskedDisplay(form.bank_ac_last4 || null, "XXXXXX")} — earlier digits are never saved.`}
            >
              <input
                type="text"
                inputMode="numeric"
                value={form.bank_ac_last4}
                placeholder="1234"
                onChange={(e) => set("bank_ac_last4", last4(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Check
              label="Eligibility check done"
              checked={form.eligibility_check_done}
              onChange={(v) => set("eligibility_check_done", v)}
            />
            <Check
              label="Duplicate household check done"
              checked={form.duplicate_household_check_done}
              onChange={(v) => set("duplicate_household_check_done", v)}
            />
          </div>

          {checksMissing ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm font-semibold text-destructive">
                Warning: mandatory checks incomplete for a New connection
              </p>
              <p className="mt-1 text-sm text-destructive/90">
                Eligibility and duplicate-household verification are the most heavily penalised MDG
                irregularities. You can still submit, but record the reason offline.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cylinder / DPR type">
              <select
                value={form.cylinder_dpr_type_id}
                onChange={(e) => set("cylinder_dpr_type_id", e.target.value)}
                className={inputClass}
              >
                <option value="">Select package</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cylinder / DPR count">
              <input
                type="number"
                min={0}
                value={form.cylinder_dpr_count}
                onChange={(e) => set("cylinder_dpr_count", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Filled / Empty at TV retrieval"
              hint={isTv ? undefined : "Only applies to Termination (TV) entries."}
            >
              <select
                value={form.filled_empty_at_tv_retrieval}
                disabled={!isTv}
                onChange={(e) => set("filled_empty_at_tv_retrieval", e.target.value as Tv)}
                className={`${inputClass} disabled:bg-muted/50 disabled:text-muted-foreground`}
              >
                <option value="N/A">N/A</option>
                <option value="Filled">Filled</option>
                <option value="Empty">Empty</option>
              </select>
            </Field>
            <Field label="Linked cash memo (optional)">
              <select
                value={form.cash_memo_no}
                onChange={(e) => set("cash_memo_no", e.target.value)}
                className={inputClass}
              >
                <option value="">No linked memo</option>
                {memos.map((m) => (
                  <option key={m.cash_memo_no} value={String(m.cash_memo_no)}>
                    #{m.cash_memo_no} · {m.sale_date} · {m.consumer_name ?? m.consumer_no ?? "—"} ·{" "}
                    {m.item}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <FilledBySelect
            roles={["computer_staff", "distributor"]}
            value={processedBy}
            onChange={setProcessedBy}
            label="Processed By"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(false)}
              className="h-12 flex-1 rounded-lg border border-input bg-background px-4 text-base font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(true)}
              className="h-12 flex-1 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Submit &amp; lock
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent entries
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2">Sr.</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Consumer</th>
                  <th className="px-3 py-2">Scheme</th>
                  <th className="px-3 py-2">Aadhaar</th>
                  <th className="px-3 py-2">Bank A/C</th>
                  <th className="px-3 py-2">Checks</th>
                  <th className="px-3 py-2">Cyl/DPR</th>
                  <th className="px-3 py-2">TV state</th>
                  <th className="px-3 py-2">Memo</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">
                      No entries yet.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-semibold">
                      {row.sr_no}
                    </td>
                    <td className="px-3 py-2">{row.entry_date}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">
                      {row.consumer_name ?? "—"}
                      <span className="block text-xs text-muted-foreground">
                        {row.consumer_no ?? ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.scheme}</td>
                    <td className="px-3 py-2">{maskedDisplay(row.aadhaar_last4)}</td>
                    <td className="px-3 py-2">{maskedDisplay(row.bank_ac_last4, "XXXXXX")}</td>
                    <td className="px-3 py-2">
                      {row.type === "New" &&
                      (!row.eligibility_check_done || !row.duplicate_household_check_done) ? (
                        <span className="rounded-full bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive">
                          Incomplete
                        </span>
                      ) : (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {packageName(row.cylinder_dpr_type_id)} × {row.cylinder_dpr_count}
                    </td>
                    <td className="px-3 py-2">{row.filled_empty_at_tv_retrieval}</td>
                    <td className="px-3 py-2">{row.cash_memo_no ?? "—"}</td>
                    <td className="px-3 py-2">
                      <EntryLockCell
                        tableName="connection_sv_entries"
                        entryId={row.id}
                        locked={Boolean(row.locked)}
                        edited={editedIds.has(row.id)}
                        onUnlocked={() => void refetch()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
