import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getSessionState } from "@/lib/agency.functions";
import { listInstallations, saveConsumer, saveInstallation } from "@/lib/installation.functions";
import { ConsumerSearch, type Consumer } from "@/components/ConsumerSearch";
import { EntryLockCell, useEditedIds } from "@/components/EntryLockCell";
import { FilledBySelect } from "@/components/FilledBySelect";

export const Route = createFileRoute("/registers/installation")({
  head: () => ({
    meta: [
      { title: "Installation & ARB Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Record stoves, lighters, aprons, trolleys and other allied retail items sold with each new LPG connection installation.",
      },
      { property: "og:title", content: "Installation & ARB Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Allied retail business revenue tracking tied to new connection installations.",
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
  component: InstallationRegisterPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type FormState = {
  consumer: Consumer | null;
  consumer_no: string;
  consumer_name: string;
  mobile_no: string;
  sv_date: string;
  installation_date: string;
  type_of_stove_sold: string;
  lighter: boolean;
  apron: boolean;
  trolley: boolean;
  other_arb: string;
  total_bill_amount: string;
  total_receipt_amount: string;
  customer_sign: string;
  distributor_sign: string;
};

const emptyForm = (): FormState => ({
  consumer: null,
  consumer_no: "",
  consumer_name: "",
  mobile_no: "",
  sv_date: today(),
  installation_date: today(),
  type_of_stove_sold: "",
  lighter: false,
  apron: false,
  trolley: false,
  other_arb: "",
  total_bill_amount: "",
  total_receipt_amount: "",
  customer_sign: "",
  distributor_sign: "",
});

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function InstallationRegisterPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const fetchList = useServerFn(listInstallations);
  const save = useServerFn(saveInstallation);
  const addConsumer = useServerFn(saveConsumer);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [filledBy, setFilledBy] = useState("");
  const [busy, setBusy] = useState(false);

  const editedIds = useEditedIds("installation_arb_entries");

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["installation-entries"],
    queryFn: () => fetchList({}),
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
      mobile_no: consumer.mobile_no ?? "",
    }));
  }

  const bill = Number(form.total_bill_amount) || 0;
  const receipt = Number(form.total_receipt_amount) || 0;
  const balance = bill - receipt;

  const isNewConsumer =
    !!form.consumer_no.trim() &&
    !!form.consumer_name.trim() &&
    (!form.consumer ||
      form.consumer.consumer_no !== form.consumer_no.trim() ||
      form.consumer.name !== form.consumer_name.trim());

  async function saveAsConsumer() {
    setBusy(true);
    try {
      const result = await addConsumer({
        data: {
          consumer_no: form.consumer_no.trim(),
          name: form.consumer_name.trim(),
          mobile_no: form.mobile_no.trim() || null,
        },
      });
      setForm((prev) => ({ ...prev, consumer: result.consumer as Consumer }));
      toast.success(
        result.created ? "Consumer added to the directory" : "Consumer already in the directory",
      );
    } catch {
      toast.error("Could not save this consumer.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(lock: boolean) {
    if (!form.consumer_name.trim()) {
      toast.error("Consumer name is required");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          id: null,
          lock,
          entry: {
            consumer_id: form.consumer?.id ?? null,
            consumer_no: form.consumer_no.trim() || null,
            consumer_name: form.consumer_name.trim() || null,
            mobile_no: form.mobile_no.trim() || null,
            sv_date: form.sv_date || null,
            installation_date: form.installation_date || null,
            type_of_stove_sold: form.type_of_stove_sold.trim() || null,
            lighter: form.lighter,
            apron: form.apron,
            trolley: form.trolley,
            other_arb: form.other_arb.trim() || null,
            total_bill_amount: bill,
            total_receipt_amount: receipt,
            customer_sign: form.customer_sign.trim() || null,
            distributor_sign: form.distributor_sign.trim() || null,
            filled_by: filledBy || null,
          },
        },
      });
      toast.success(lock ? "Entry submitted and locked" : "Draft saved");
      setForm(emptyForm());
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {session.agencyName}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Installation &amp; ARB Register
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

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">New installation entry</h2>

          <div className="space-y-4">
            <ConsumerSearch value={form.consumer} onSelect={onConsumerSelect} />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Consumer no.">
                <input
                  className={inputClass}
                  value={form.consumer_no}
                  onChange={(e) => set("consumer_no", e.target.value)}
                />
              </Field>
              <Field label="Consumer name">
                <input
                  className={inputClass}
                  value={form.consumer_name}
                  onChange={(e) => set("consumer_name", e.target.value)}
                />
              </Field>
              <Field label="Mobile no.">
                <input
                  className={inputClass}
                  inputMode="tel"
                  value={form.mobile_no}
                  onChange={(e) => set("mobile_no", e.target.value)}
                />
              </Field>
            </div>

            {isNewConsumer ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/60 bg-accent/15 px-3 py-2">
                <p className="text-sm text-accent-foreground">
                  This consumer isn&apos;t in the directory yet.
                </p>
                <button
                  type="button"
                  onClick={saveAsConsumer}
                  disabled={busy}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  Save as new consumer
                </button>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="SV date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.sv_date}
                  onChange={(e) => set("sv_date", e.target.value)}
                />
              </Field>
              <Field label="Installation date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.installation_date}
                  onChange={(e) => set("installation_date", e.target.value)}
                />
              </Field>
              <Field label="Type of stove sold">
                <input
                  className={inputClass}
                  list="stove-types"
                  placeholder="e.g. 2 Burner SS"
                  value={form.type_of_stove_sold}
                  onChange={(e) => set("type_of_stove_sold", e.target.value)}
                />
              </Field>
            </div>
            <datalist id="stove-types">
              <option value="1 Burner" />
              <option value="2 Burner SS" />
              <option value="2 Burner Glass Top" />
              <option value="3 Burner Glass Top" />
              <option value="4 Burner Glass Top" />
            </datalist>

            <div>
              <span className="text-sm font-medium text-foreground">Accessories included</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["lighter", "apron", "trolley"] as const).map((key) => (
                  <label
                    key={key}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 text-base capitalize text-foreground"
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[hsl(var(--primary))]"
                      checked={form[key]}
                      onChange={(e) => set(key, e.target.checked)}
                    />
                    {key}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Other ARB items">
              <input
                className={inputClass}
                placeholder="Anything not covered above"
                value={form.other_arb}
                onChange={(e) => set("other_arb", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Total bill amount (₹)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.total_bill_amount}
                  onChange={(e) => set("total_bill_amount", e.target.value)}
                />
              </Field>
              <Field label="Total receipt amount (₹)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.total_receipt_amount}
                  onChange={(e) => set("total_receipt_amount", e.target.value)}
                />
              </Field>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Balance</span>
                <div
                  className={`flex h-12 items-center rounded-lg border border-input bg-muted/40 px-3 text-base font-semibold ${
                    balance > 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  ₹ {balance.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Customer signature (typed name)">
                <input
                  className={inputClass}
                  value={form.customer_sign}
                  onChange={(e) => set("customer_sign", e.target.value)}
                />
              </Field>
              <Field label="Distributor signature (typed name)">
                <input
                  className={inputClass}
                  value={form.distributor_sign}
                  onChange={(e) => set("distributor_sign", e.target.value)}
                />
              </Field>
              <FilledBySelect
                roles={["computer_staff", "distributor"]}
                value={filledBy}
                onChange={setFilledBy}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              This register is revenue-only — it does not affect cylinder or DPR stock balances.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void submit(false)}
                disabled={busy}
                className="h-12 flex-1 rounded-lg border border-input bg-background px-4 text-base font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => void submit(true)}
                disabled={busy}
                className="h-12 flex-1 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Submit &amp; lock
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-5 py-4 text-base font-semibold text-foreground">
            Recent entries
          </h2>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No entries recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3">Sr.</th>
                    <th className="px-4 py-3">Consumer</th>
                    <th className="px-4 py-3">SV date</th>
                    <th className="px-4 py-3">Installed</th>
                    <th className="px-4 py-3">Stove</th>
                    <th className="px-4 py-3">Accessories</th>
                    <th className="px-4 py-3 text-right">Bill</th>
                    <th className="px-4 py-3 text-right">Receipt</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const acc = [
                      row.lighter ? "Lighter" : null,
                      row.apron ? "Apron" : null,
                      row.trolley ? "Trolley" : null,
                      row.other_arb || null,
                    ].filter(Boolean);
                    return (
                      <tr key={row.id} className="border-b border-border/60 last:border-0">
                        <td className="sticky left-0 z-10 bg-card px-4 py-3 font-semibold text-foreground">
                          {row.sr_no}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {row.consumer_name}
                          <span className="block text-xs text-muted-foreground">
                            {row.consumer_no}
                            {row.mobile_no ? ` · ${row.mobile_no}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.sv_date ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.installation_date ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.type_of_stove_sold ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {acc.length ? acc.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          ₹ {row.total_bill_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          ₹ {row.total_receipt_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <EntryLockCell
                            tableName="installation_arb_entries"
                            entryId={row.id}
                            locked={Boolean(row.locked)}
                            edited={editedIds.has(row.id)}
                            onUnlocked={() => void refetch()}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
