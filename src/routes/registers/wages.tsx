import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getSessionState, getActiveStaff } from "@/lib/agency.functions";
import { listWages, saveWage } from "@/lib/distributor-registers.functions";
import { ExportPdfButton } from "@/components/ExportPdfButton";

export const Route = createFileRoute("/registers/wages")({
  head: () => ({
    meta: [
      { title: "Staff Wage Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Distributor-only monthly staff wage register with days worked, gross wage, PF, ESI and net paid.",
      },
      { property: "og:title", content: "Staff Wage Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Monthly wage records for LPG agency staff, restricted to the distributor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    const session = await getSessionState();
    if (!session.authed) throw redirect({ to: "/" });
    if (!session.role) throw redirect({ to: "/role" });
    if (session.role !== "distributor") throw redirect({ to: "/dashboard" });
    return session;
  },
  component: WageRegisterPage,
});

const currentMonth = () => new Date().toISOString().slice(0, 7);
const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

type FormState = {
  id: string | null;
  month_year: string;
  staff_id: string;
  days_worked: string;
  gross_wage: string;
  pf_applicable: string;
  esi_applicable: string;
  net_paid: string;
  net_paid_override: boolean;
  payment_mode: string;
  payment_date: string;
  remarks: string;
  proprietor_signature: string;
};

const emptyForm = (): FormState => ({
  id: null,
  month_year: currentMonth(),
  staff_id: "",
  days_worked: "0",
  gross_wage: "0",
  pf_applicable: "0",
  esi_applicable: "0",
  net_paid: "0",
  net_paid_override: false,
  payment_mode: "Cash",
  payment_date: "",
  remarks: "",
  proprietor_signature: "",
});

const n = (v: string) => Number(v || 0);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function WageRegisterPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchList = useServerFn(listWages);
  const fetchStaff = useServerFn(getActiveStaff);
  const save = useServerFn(saveWage);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["wages", month],
    queryFn: () => fetchList({ data: { month } }),
  });

  const { data: staff } = useQuery({
    queryKey: ["active-staff", "wages"],
    queryFn: () => fetchStaff({ data: { roles: [] } }),
  });

  const computedNet = n(form.gross_wage) - n(form.pf_applicable) - n(form.esi_applicable);
  const rows = data ?? [];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(lock: boolean) {
    if (!form.staff_id) {
      toast.error("Select the staff member.");
      return;
    }
    const picked = (staff ?? []).find((s) => s.id === form.staff_id);
    setSaving(true);
    try {
      await save({
        data: {
          id: form.id,
          entry: {
            month_year: form.month_year,
            staff_id: form.staff_id,
            staff_name: picked?.name ?? null,
            role: (picked?.role as "godown" | "computer_staff" | "distributor") ?? null,
            days_worked: n(form.days_worked),
            gross_wage: n(form.gross_wage),
            pf_applicable: n(form.pf_applicable),
            esi_applicable: n(form.esi_applicable),
            net_paid: form.net_paid_override ? n(form.net_paid) : computedNet,
            net_paid_override: form.net_paid_override,
            payment_mode: form.payment_mode || null,
            payment_date: form.payment_date || null,
            remarks: form.remarks.trim() || null,
            proprietor_signature: form.proprietor_signature.trim() || null,
            locked: lock,
          },
        },
      });
      toast.success(lock ? "Wage entry submitted and locked." : "Wage entry saved.");
      setForm({ ...emptyForm(), month_year: form.month_year });
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the wage entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {session.agencyName} · Distributor only
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Staff Wage Register
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExportPdfButton register="wage" />
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {form.id ? "Edit wage entry" : "Add wage entry"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Month">
              <input
                type="month"
                className={inputClass}
                value={form.month_year}
                onChange={(e) => set("month_year", e.target.value)}
              />
            </Field>

            <Field label="Staff member">
              <select
                className={inputClass}
                value={form.staff_id}
                onChange={(e) => set("staff_id", e.target.value)}
              >
                <option value="">Select staff member</option>
                {(staff ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Days worked">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.days_worked}
                onChange={(e) => set("days_worked", e.target.value)}
              />
            </Field>

            <Field label="Gross wage (₹)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.gross_wage}
                onChange={(e) => set("gross_wage", e.target.value)}
              />
            </Field>

            <Field label="PF applicable (₹)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.pf_applicable}
                onChange={(e) => set("pf_applicable", e.target.value)}
              />
            </Field>

            <Field label="ESI applicable (₹)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.esi_applicable}
                onChange={(e) => set("esi_applicable", e.target.value)}
              />
            </Field>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Net paid (₹)</span>
              <input
                type="number"
                step="0.01"
                className={`${inputClass} ${form.net_paid_override ? "" : "bg-muted/50"}`}
                readOnly={!form.net_paid_override}
                value={form.net_paid_override ? form.net_paid : String(computedNet)}
                onChange={(e) => set("net_paid", e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.net_paid_override}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      net_paid_override: on,
                      net_paid: on ? String(computedNet) : prev.net_paid,
                    }));
                  }}
                />
                Manual override (default is gross − PF − ESI)
              </label>
            </div>

            <Field label="Payment mode">
              <select
                className={inputClass}
                value={form.payment_mode}
                onChange={(e) => set("payment_mode", e.target.value)}
              >
                {["Cash", "Bank transfer", "UPI", "Cheque"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment date">
              <input
                type="date"
                className={inputClass}
                value={form.payment_date}
                onChange={(e) => set("payment_date", e.target.value)}
              />
            </Field>

            <Field label="Proprietor signature (typed name)">
              <input
                className={inputClass}
                value={form.proprietor_signature}
                onChange={(e) => set("proprietor_signature", e.target.value)}
                placeholder="Name"
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Remarks">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(false)}
              className="h-12 rounded-lg border border-input bg-background px-5 text-base font-medium text-foreground hover:bg-secondary disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(true)}
              className="h-12 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Submit & lock"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(emptyForm())}
                className="h-12 rounded-lg px-4 text-base font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="text-base font-semibold text-foreground">Monthly wage records</h2>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Month
              <input
                type="month"
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Staff</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Days</th>
                  <th className="px-3 py-3">Gross</th>
                  <th className="px-3 py-3">PF</th>
                  <th className="px-3 py-3">ESI</th>
                  <th className="px-3 py-3">Net paid</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-muted-foreground">
                      No wage records for this month.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-3 font-medium text-foreground">
                      {row.staff_name ?? "—"}
                    </td>
                    <td className="px-3 py-3">{row.role ?? "—"}</td>
                    <td className="px-3 py-3">{row.days_worked}</td>
                    <td className="px-3 py-3">₹{Number(row.gross_wage).toFixed(2)}</td>
                    <td className="px-3 py-3">₹{Number(row.pf_applicable).toFixed(2)}</td>
                    <td className="px-3 py-3">₹{Number(row.esi_applicable).toFixed(2)}</td>
                    <td className="px-3 py-3 font-semibold text-foreground">
                      ₹{Number(row.net_paid).toFixed(2)}
                      {row.net_paid_override ? (
                        <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-xs font-medium">
                          override
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.payment_mode ?? "—"}
                      {row.payment_date ? ` · ${row.payment_date}` : ""}
                    </td>
                    <td className="px-3 py-3">{row.locked ? "Locked" : "Draft"}</td>
                    <td className="px-3 py-3">
                      {row.locked ? (
                        <button
                          type="button"
                          onClick={() =>
                            toast.info("This record is locked — use the OTP edit flow.")
                          }
                          className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-secondary"
                        >
                          Request edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-secondary"
                          onClick={() =>
                            setForm({
                              id: row.id,
                              month_year: row.month_year,
                              staff_id: row.staff_id ?? "",
                              days_worked: String(row.days_worked),
                              gross_wage: String(row.gross_wage),
                              pf_applicable: String(row.pf_applicable),
                              esi_applicable: String(row.esi_applicable),
                              net_paid: String(row.net_paid),
                              net_paid_override: row.net_paid_override,
                              payment_mode: row.payment_mode ?? "Cash",
                              payment_date: row.payment_date ?? "",
                              remarks: row.remarks ?? "",
                              proprietor_signature: row.proprietor_signature ?? "",
                            })
                          }
                        >
                          Edit
                        </button>
                      )}
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
