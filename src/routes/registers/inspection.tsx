import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getSessionState } from "@/lib/agency.functions";
import { listInspections, saveInspection } from "@/lib/distributor-registers.functions";

export const Route = createFileRoute("/registers/inspection")({
  head: () => ({
    meta: [
      { title: "Inspection Report Log — LPG Register Book" },
      {
        name: "description",
        content:
          "Distributor-only log of oil company and statutory inspections, irregularities, show-cause notices and fines.",
      },
      { property: "og:title", content: "Inspection Report Log — LPG Register Book" },
      {
        property: "og:description",
        content: "Track inspection visits, irregularity category, SCN dates, replies and fines.",
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
  component: InspectionLogPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

const types = ["Routine", "Surprise", "Investigation"] as const;
const categories = ["Critical", "Major", "Minor", "None"] as const;
type InspType = (typeof types)[number];
type Category = (typeof categories)[number];

const categoryClass: Record<Category, string> = {
  Critical: "bg-destructive/10 text-destructive",
  Major: "bg-accent/20 text-foreground",
  Minor: "bg-muted text-muted-foreground",
  None: "bg-primary/10 text-primary",
};

type FormState = {
  id: string | null;
  inspection_date: string;
  officer_name_designation: string;
  type: InspType;
  irregularity_category: Category;
  scn_date: string;
  reply_date: string;
  speaking_order_date: string;
  fine_amount: string;
  report_filed: boolean;
  report_file_ref: string;
};

const emptyForm = (): FormState => ({
  id: null,
  inspection_date: today(),
  officer_name_designation: "",
  type: "Routine",
  irregularity_category: "None",
  scn_date: "",
  reply_date: "",
  speaking_order_date: "",
  fine_amount: "0",
  report_filed: false,
  report_file_ref: "",
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function InspectionLogPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchList = useServerFn(listInspections);
  const save = useServerFn(saveInspection);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => fetchList({}),
  });

  const rows = data ?? [];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(lock: boolean) {
    if (!form.officer_name_designation.trim()) {
      toast.error("Enter the inspecting officer's name and designation.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: form.id,
          entry: {
            inspection_date: form.inspection_date,
            officer_name_designation: form.officer_name_designation.trim(),
            type: form.type,
            irregularity_category: form.irregularity_category,
            scn_date: form.scn_date || null,
            reply_date: form.reply_date || null,
            speaking_order_date: form.speaking_order_date || null,
            fine_amount: Number(form.fine_amount || 0),
            report_filed: form.report_filed,
            report_file_ref: form.report_file_ref.trim() || null,
            locked: lock,
          },
        },
      });
      toast.success(lock ? "Inspection submitted and locked." : "Inspection saved.");
      setForm(emptyForm());
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this inspection.");
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
              Inspection Report Log
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
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {form.id ? "Edit inspection" : "Log an inspection"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Inspection date">
              <input
                type="date"
                className={inputClass}
                value={form.inspection_date}
                onChange={(e) => set("inspection_date", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-1 lg:col-span-2">
              <Field label="Officer name & designation">
                <input
                  className={inputClass}
                  value={form.officer_name_designation}
                  onChange={(e) => set("officer_name_designation", e.target.value)}
                  placeholder="e.g. R. Sharma, Sales Officer, IOCL"
                />
              </Field>
            </div>

            <Field label="Type">
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => set("type", e.target.value as InspType)}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Irregularity category">
              <select
                className={inputClass}
                value={form.irregularity_category}
                onChange={(e) => set("irregularity_category", e.target.value as Category)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fine amount (₹)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.fine_amount}
                onChange={(e) => set("fine_amount", e.target.value)}
              />
            </Field>

            <Field label="SCN date">
              <input
                type="date"
                className={inputClass}
                value={form.scn_date}
                onChange={(e) => set("scn_date", e.target.value)}
              />
            </Field>

            <Field label="Reply date">
              <input
                type="date"
                className={inputClass}
                value={form.reply_date}
                onChange={(e) => set("reply_date", e.target.value)}
              />
            </Field>

            <Field label="Speaking order date">
              <input
                type="date"
                className={inputClass}
                value={form.speaking_order_date}
                onChange={(e) => set("speaking_order_date", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={form.report_filed}
                  onChange={(e) => set("report_filed", e.target.checked)}
                />
                Scanned report filed
              </label>
              <Field label="Report reference (file name or location)">
                <input
                  className={inputClass}
                  value={form.report_file_ref}
                  onChange={(e) => set("report_file_ref", e.target.value)}
                  placeholder="e.g. 2026-08 IOCL routine.pdf — file cabinet 2"
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
          <div className="border-b border-border p-4">
            <h2 className="text-base font-semibold text-foreground">Inspection history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Officer</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Irregularity</th>
                  <th className="px-3 py-3">SCN</th>
                  <th className="px-3 py-3">Reply</th>
                  <th className="px-3 py-3">Speaking order</th>
                  <th className="px-3 py-3">Fine</th>
                  <th className="px-3 py-3">Report</th>
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
                      No inspections logged yet.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-3 whitespace-nowrap">{row.inspection_date}</td>
                    <td className="px-3 py-3 text-foreground">
                      {row.officer_name_designation ?? "—"}
                    </td>
                    <td className="px-3 py-3">{row.type}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          categoryClass[row.irregularity_category as Category]
                        }`}
                      >
                        {row.irregularity_category}
                      </span>
                    </td>
                    <td className="px-3 py-3">{row.scn_date ?? "—"}</td>
                    <td className="px-3 py-3">{row.reply_date ?? "—"}</td>
                    <td className="px-3 py-3">{row.speaking_order_date ?? "—"}</td>
                    <td className="px-3 py-3">₹{Number(row.fine_amount).toFixed(2)}</td>
                    <td className="px-3 py-3">{row.report_filed ? "Filed" : "Pending"}</td>
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
                              inspection_date: row.inspection_date,
                              officer_name_designation: row.officer_name_designation ?? "",
                              type: row.type as InspType,
                              irregularity_category: row.irregularity_category as Category,
                              scn_date: row.scn_date ?? "",
                              reply_date: row.reply_date ?? "",
                              speaking_order_date: row.speaking_order_date ?? "",
                              fine_amount: String(row.fine_amount),
                              report_filed: row.report_filed,
                              report_file_ref: row.report_file_ref ?? "",
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
