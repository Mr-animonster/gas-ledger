import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getSessionState } from "@/lib/agency.functions";
import { listDefectives, saveDefective } from "@/lib/defective.functions";
import { getPackageCodes } from "@/lib/reference.functions";
import { ConsumerSearch, type Consumer } from "@/components/ConsumerSearch";
import { FilledBySelect } from "@/components/FilledBySelect";

export const Route = createFileRoute("/registers/defective")({
  head: () => ({
    meta: [
      { title: "Defective Cylinder/DPR Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Log defective LPG cylinders and DPRs from identification through consumer exchange and plant reconciliation.",
      },
      { property: "og:title", content: "Defective Cylinder/DPR Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Track defective cylinder identification, replacement and plant returns.",
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
  component: DefectiveRegisterPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type Source = "Truck" | "Consumer";
type Seal = "OK" | "Damaged" | "N/A";

type FormState = {
  id: string | null;
  date_of_identification: string;
  cylinder_dpr_type_id: string;
  cylinder_dpr_sr_no: string;
  batch_no: string;
  seal_condition: Seal;
  nature_of_defect: string;
  source: Source;
  tt_no: string;
  consumer: Consumer | null;
  consumer_no: string;
  consumer_name: string;
  consumer_contact: string;
  prcn: string;
  prcn_sent_on: string;
  prcn_received: boolean;
  driver_consumer_signature: string;
  plant_name: string;
  sent_to_plant_on: string;
  received_replacement_stock_on: string;
  distributor_signature: string;
};

const emptyForm = (): FormState => ({
  id: null,
  date_of_identification: today(),
  cylinder_dpr_type_id: "",
  cylinder_dpr_sr_no: "",
  batch_no: "",
  seal_condition: "N/A",
  nature_of_defect: "",
  source: "Consumer",
  tt_no: "",
  consumer: null,
  consumer_no: "",
  consumer_name: "",
  consumer_contact: "",
  prcn: "",
  prcn_sent_on: "",
  prcn_received: false,
  driver_consumer_signature: "",
  plant_name: "",
  sent_to_plant_on: "",
  received_replacement_stock_on: "",
  distributor_signature: "",
});

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DefectiveRegisterPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listDefectives);
  const fetchPackages = useServerFn(getPackageCodes);
  const save = useServerFn(saveDefective);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [filledBy, setFilledBy] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["defective-entries"],
    queryFn: () => fetchList({}),
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
      consumer_contact: consumer.mobile_no ?? prev.consumer_contact,
    }));
  }

  const fromTruck = form.source === "Truck";

  function loadEntry(row: (typeof rows)[number]) {
    if (row.locked) {
      toast.error("This entry is locked. Request an edit to make changes.");
      return;
    }
    setForm({
      id: row.id,
      date_of_identification: row.date_of_identification,
      cylinder_dpr_type_id: row.cylinder_dpr_type_id ?? "",
      cylinder_dpr_sr_no: row.cylinder_dpr_sr_no ?? "",
      batch_no: row.batch_no ?? "",
      seal_condition: row.seal_condition as Seal,
      nature_of_defect: row.nature_of_defect ?? "",
      source: row.source as Source,
      tt_no: row.tt_no ?? "",
      consumer: null,
      consumer_no: row.consumer_no ?? "",
      consumer_name: row.consumer_name ?? "",
      consumer_contact: row.consumer_contact ?? "",
      prcn: row.prcn ?? "",
      prcn_sent_on: row.prcn_sent_on ?? "",
      prcn_received: row.prcn_received,
      driver_consumer_signature: row.driver_consumer_signature ?? "",
      plant_name: row.plant_name ?? "",
      sent_to_plant_on: row.sent_to_plant_on ?? "",
      received_replacement_stock_on: row.received_replacement_stock_on ?? "",
      distributor_signature: row.distributor_signature ?? "",
    });
    setFilledBy(row.filled_by ?? "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(lock: boolean) {
    if (!form.nature_of_defect.trim()) {
      toast.error("Describe the nature of the defect first.");
      return;
    }
    if (fromTruck && !form.tt_no.trim()) {
      toast.error("Enter the truck number carrying the cylinder.");
      return;
    }
    if (!fromTruck && !form.consumer_no.trim() && !form.consumer_name.trim()) {
      toast.error("Select or enter the consumer this cylinder came from.");
      return;
    }

    setBusy(true);
    try {
      const result = await save({
        data: {
          id: form.id,
          lock,
          entry: {
            date_of_identification: form.date_of_identification,
            cylinder_dpr_type_id: form.cylinder_dpr_type_id || null,
            cylinder_dpr_sr_no: form.cylinder_dpr_sr_no.trim() || null,
            batch_no: form.batch_no.trim() || null,
            seal_condition: form.seal_condition,
            nature_of_defect: form.nature_of_defect.trim() || null,
            source: form.source,
            tt_no: fromTruck ? form.tt_no.trim() || null : null,
            consumer_id: fromTruck ? null : (form.consumer?.id ?? null),
            consumer_no: fromTruck ? null : form.consumer_no.trim() || null,
            consumer_name: fromTruck ? null : form.consumer_name.trim() || null,
            consumer_contact: fromTruck ? null : form.consumer_contact.trim() || null,
            prcn: fromTruck ? null : form.prcn.trim() || null,
            prcn_sent_on: fromTruck ? null : form.prcn_sent_on || null,
            prcn_received: fromTruck ? false : form.prcn_received,
            driver_consumer_signature: fromTruck
              ? null
              : form.driver_consumer_signature.trim() || null,
            plant_name: form.plant_name.trim() || null,
            sent_to_plant_on: form.sent_to_plant_on || null,
            received_replacement_stock_on: form.received_replacement_stock_on || null,
            distributor_signature: form.distributor_signature.trim() || null,
            filled_by: filledBy || null,
          },
        },
      });
      toast.success(
        lock
          ? `Entry ${form.id ? "" : `#${result.sr_no ?? ""} `}submitted and locked`
          : "Saved — you can add Stage 2 details later",
      );
      setForm(emptyForm());
      setFilledBy("");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this entry.");
    } finally {
      setBusy(false);
    }
  }

  const packageName = (id: string | null) => packages.find((p) => p.id === id)?.code ?? "—";

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Register
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Defective Cylinder / DPR Register
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
        {form.id ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Editing an existing unlocked entry — add Stage 1 / Stage 2 details and save again.
            </p>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm());
                setFilledBy("");
              }}
              className="h-10 shrink-0 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              New entry
            </button>
          </div>
        ) : null}

        <Section title="Identification" subtitle="Required for every entry.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of identification">
              <input
                type="date"
                value={form.date_of_identification}
                onChange={(e) => set("date_of_identification", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Cylinder type / DPR">
              <select
                value={form.cylinder_dpr_type_id}
                onChange={(e) => set("cylinder_dpr_type_id", e.target.value)}
                className={inputClass}
              >
                <option value="">Select type</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cylinder / DPR serial no.">
              <input
                type="text"
                value={form.cylinder_dpr_sr_no}
                onChange={(e) => set("cylinder_dpr_sr_no", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Batch no.">
              <input
                type="text"
                value={form.batch_no}
                onChange={(e) => set("batch_no", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Seal condition">
              <select
                value={form.seal_condition}
                onChange={(e) => set("seal_condition", e.target.value as Seal)}
                className={inputClass}
              >
                <option value="OK">OK</option>
                <option value="Damaged">Damaged</option>
                <option value="N/A">N/A</option>
              </select>
            </Field>
            <Field label="Source">
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value as Source)}
                className={inputClass}
              >
                <option value="Consumer">Consumer</option>
                <option value="Truck">Truck</option>
              </select>
            </Field>
          </div>

          <Field label="Nature of defect">
            <textarea
              rows={3}
              value={form.nature_of_defect}
              onChange={(e) => set("nature_of_defect", e.target.value)}
              placeholder="e.g. Bung leak, dented body, valve not seating"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>

          {fromTruck ? (
            <Field label="Truck number carrying the cylinder">
              <input
                type="text"
                value={form.tt_no}
                onChange={(e) => set("tt_no", e.target.value)}
                placeholder="e.g. MH12AB1234"
                className={inputClass}
              />
            </Field>
          ) : (
            <div className="space-y-4">
              <ConsumerSearch value={form.consumer} onSelect={onConsumerSelect} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Consumer no.">
                  <input
                    type="text"
                    value={form.consumer_no}
                    onChange={(e) => set("consumer_no", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Consumer name">
                  <input
                    type="text"
                    value={form.consumer_name}
                    onChange={(e) => set("consumer_name", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Consumer contact">
                  <input
                    type="tel"
                    value={form.consumer_contact}
                    onChange={(e) => set("consumer_contact", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}
        </Section>

        {!fromTruck ? (
          <Section
            title="Stage 1 · Exchange with consumer"
            subtitle="Replacement cylinder issued against the defective one."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Replacement cylinder no. issued in exchange">
                <input
                  type="text"
                  value={form.prcn}
                  onChange={(e) => set("prcn", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Replacement sent on">
                <input
                  type="date"
                  value={form.prcn_sent_on}
                  onChange={(e) => set("prcn_sent_on", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-input bg-background px-3 sm:mt-6">
                <input
                  type="checkbox"
                  checked={form.prcn_received}
                  onChange={(e) => set("prcn_received", e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
                <span className="text-base text-foreground">
                  Replacement confirmed received by consumer/driver
                </span>
              </label>
              <Field label="Driver / consumer signature (typed name)">
                <input
                  type="text"
                  value={form.driver_consumer_signature}
                  onChange={(e) => set("driver_consumer_signature", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>
        ) : null}

        <Section
          title="Stage 2 · Godown-to-plant reconciliation"
          subtitle="Often filled days later — save now and reopen this entry to complete it while it is still unlocked."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plant name">
              <input
                type="text"
                value={form.plant_name}
                onChange={(e) => set("plant_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Sent to plant on">
              <input
                type="date"
                value={form.sent_to_plant_on}
                onChange={(e) => set("sent_to_plant_on", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Received replacement stock on">
              <input
                type="date"
                value={form.received_replacement_stock_on}
                onChange={(e) => set("received_replacement_stock_on", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Distributor signature (typed name)">
              <input
                type="text"
                value={form.distributor_signature}
                onChange={(e) => set("distributor_signature", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <FilledBySelect
            roles={["godown", "distributor"]}
            value={filledBy}
            onChange={setFilledBy}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(false)}
              className="h-12 flex-1 rounded-lg border border-input bg-background px-4 text-base font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
            >
              Save (stays editable)
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
        </Section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent entries
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2">Sr.</th>
                  <th className="px-3 py-2">Identified</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Cyl/DPR no.</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">Defect</th>
                  <th className="px-3 py-2">Stage 1</th>
                  <th className="px-3 py-2">Stage 2</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                      No entries yet.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-semibold">
                      {row.sr_no}
                    </td>
                    <td className="px-3 py-2">{row.date_of_identification}</td>
                    <td className="px-3 py-2">{packageName(row.cylinder_dpr_type_id)}</td>
                    <td className="px-3 py-2">{row.cylinder_dpr_sr_no ?? "—"}</td>
                    <td className="px-3 py-2">{row.source}</td>
                    <td className="px-3 py-2">
                      {row.source === "Truck" ? (row.tt_no ?? "—") : (row.consumer_name ?? "—")}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2">
                      {row.nature_of_defect ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.source === "Consumer"
                        ? row.prcn_received
                          ? "Replaced"
                          : row.prcn
                            ? "Sent"
                            : "Pending"
                        : "N/A"}
                    </td>
                    <td className="px-3 py-2">
                      {row.received_replacement_stock_on
                        ? "Reconciled"
                        : row.sent_to_plant_on
                          ? "At plant"
                          : "Pending"}
                    </td>
                    <td className="px-3 py-2">
                      <EntryLockCell
                        tableName="defective_entries"
                        entryId={row.id}
                        locked={Boolean(row.locked)}
                        edited={editedIds.has(row.id)}
                        onEdit={() => loadEntry(row)}
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
