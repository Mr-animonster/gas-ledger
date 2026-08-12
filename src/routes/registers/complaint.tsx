import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { getSessionState } from "@/lib/agency.functions";
import { listComplaints, saveComplaint } from "@/lib/complaint.functions";
import { ConsumerSearch, type Consumer } from "@/components/ConsumerSearch";
import { EntryLockCell, useEditedIds } from "@/components/EntryLockCell";
import { FilledBySelect } from "@/components/FilledBySelect";

export const Route = createFileRoute("/registers/complaint")({
  head: () => ({
    meta: [
      { title: "Complaint Register — LPG Register Book" },
      {
        name: "description",
        content:
          "Log consumer complaints for your LPG agency with nature of complaint, action taken and resolution status.",
      },
      { property: "og:title", content: "Complaint Register — LPG Register Book" },
      {
        property: "og:description",
        content: "Record and resolve LPG consumer complaints with a searchable log.",
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
  component: ComplaintRegisterPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const natures = ["Delay", "Leakage", "Behaviour", "Other"] as const;
type Nature = (typeof natures)[number];

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

type FormState = {
  id: string | null;
  entry_date: string;
  consumer: Consumer | null;
  consumer_no: string;
  consumer_name: string;
  consumer_contact: string;
  complaint_text: string;
  nature: Nature;
  action_taken: string;
  resolved_date: string;
  resolved_by: string;
};

const emptyForm = (): FormState => ({
  id: null,
  entry_date: today(),
  consumer: null,
  consumer_no: "",
  consumer_name: "",
  consumer_contact: "",
  complaint_text: "",
  nature: "Other",
  action_taken: "",
  resolved_date: "",
  resolved_by: "",
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function ComplaintRegisterPage() {
  const session = Route.useLoaderData();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [saving, setSaving] = useState(false);

  const fetchList = useServerFn(listComplaints);
  const save = useServerFn(saveComplaint);

  const editedIds = useEditedIds("complaint_entries");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => fetchList({}),
  });

  const rows = useMemo(() => {
    const list = [...(data ?? [])];
    if (sortBy === "status") {
      list.sort((a, b) => {
        const av = a.resolved_date ? 1 : 0;
        const bv = b.resolved_date ? 1 : 0;
        if (av !== bv) return av - bv;
        return String(b.entry_date).localeCompare(String(a.entry_date));
      });
    } else {
      list.sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
    }
    return list;
  }, [data, sortBy]);

  const openCount = rows.filter((r) => !r.resolved_date).length;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.complaint_text.trim()) {
      toast.error("Enter the complaint details.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: form.id,
          entry: {
            entry_date: form.entry_date,
            consumer_id: form.consumer?.id ?? null,
            consumer_no: form.consumer_no.trim() || null,
            consumer_name: form.consumer_name.trim() || null,
            consumer_contact: form.consumer_contact.trim() || null,
            complaint_text: form.complaint_text.trim(),
            nature: form.nature,
            action_taken: form.action_taken.trim() || null,
            resolved_date: form.resolved_date || null,
            resolved_by: form.resolved_by || null,
          },
        },
      });
      toast.success(form.id ? "Complaint updated." : "Complaint logged.");
      setForm(emptyForm());
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the complaint.");
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
              {session.agencyName}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Complaint Register</h1>
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
            {form.id ? "Edit complaint" : "Add complaint"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={form.entry_date}
                onChange={(e) => set("entry_date", e.target.value)}
              />
            </Field>

            <Field label="Nature of complaint">
              <select
                className={inputClass}
                value={form.nature}
                onChange={(e) => set("nature", e.target.value as Nature)}
              >
                {natures.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <ConsumerSearch
                value={form.consumer}
                onSelect={(c) =>
                  setForm((prev) => ({
                    ...prev,
                    consumer: c,
                    consumer_no: c?.consumer_no ?? "",
                    consumer_name: c?.name ?? "",
                    consumer_contact: c?.mobile_no ?? "",
                  }))
                }
              />
            </div>

            <Field label="Consumer name">
              <input
                className={inputClass}
                value={form.consumer_name}
                onChange={(e) => set("consumer_name", e.target.value)}
                placeholder="Name"
              />
            </Field>

            <Field label="Contact number">
              <input
                className={inputClass}
                value={form.consumer_contact}
                onChange={(e) => set("consumer_contact", e.target.value)}
                placeholder="Mobile"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Complaint">
                <textarea
                  className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  value={form.complaint_text}
                  onChange={(e) => set("complaint_text", e.target.value)}
                  placeholder="What did the consumer report?"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Action taken">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  value={form.action_taken}
                  onChange={(e) => set("action_taken", e.target.value)}
                  placeholder="Steps taken to resolve"
                />
              </Field>
            </div>

            <Field label="Resolved on">
              <input
                type="date"
                className={inputClass}
                value={form.resolved_date}
                onChange={(e) => set("resolved_date", e.target.value)}
              />
            </Field>

            <FilledBySelect
              label="Resolved by"
              roles={["computer_staff", "godown", "distributor"]}
              value={form.resolved_by}
              onChange={(id) => set("resolved_by", id)}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="h-12 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : form.id ? "Update complaint" : "Add complaint"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(emptyForm())}
                className="h-12 rounded-lg border border-input bg-background px-5 text-base font-medium text-foreground hover:bg-secondary"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="text-base font-semibold text-foreground">
              Complaints{" "}
              <span className="text-sm font-normal text-muted-foreground">({openCount} open)</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <select
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "status")}
              >
                <option value="date">Date (newest)</option>
                <option value="status">Unresolved first</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Sr.</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Consumer</th>
                  <th className="px-3 py-3">Nature</th>
                  <th className="px-3 py-3">Complaint</th>
                  <th className="px-3 py-3">Action taken</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                      No complaints logged yet.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-3 py-3 font-medium text-foreground">{row.sr_no}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{row.entry_date}</td>
                    <td className="px-3 py-3">
                      <span className="block text-foreground">{row.consumer_name ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.consumer_no ?? ""}
                      </span>
                    </td>
                    <td className="px-3 py-3">{row.nature}</td>
                    <td className="max-w-64 px-3 py-3 text-muted-foreground">
                      {row.complaint_text}
                    </td>
                    <td className="max-w-56 px-3 py-3 text-muted-foreground">
                      {row.action_taken ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.resolved_date ? (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          Resolved {row.resolved_date}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <EntryLockCell
                        tableName="complaint_entries"
                        entryId={row.id}
                        locked={Boolean(row.locked)}
                        edited={editedIds.has(row.id)}
                        onUnlocked={() => void refetch()}
                        onEdit={() =>
                          setForm({
                            id: row.id,
                            entry_date: row.entry_date,
                            consumer: null,
                            consumer_no: row.consumer_no ?? "",
                            consumer_name: row.consumer_name ?? "",
                            consumer_contact: row.consumer_contact ?? "",
                            complaint_text: row.complaint_text ?? "",
                            nature: row.nature as Nature,
                            action_taken: row.action_taken ?? "",
                            resolved_date: row.resolved_date ?? "",
                            resolved_by: row.resolved_by ?? "",
                          })
                        }
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
