import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listEditLog, listPendingEdits } from "@/lib/edit-requests.functions";

const REGISTER_LABELS: Record<string, string> = {
  stock_entries: "Daily Stock Register",
  sqc_entries: "SQC Register",
  sales_batches: "Sales Register",
  sales_entries: "Sales Register",
  installation_arb_entries: "Installation & ARB Register",
  connection_sv_entries: "Connection/SV Register",
  defective_entries: "Defective Cylinder/DPR Register",
  complaint_entries: "Complaint Register",
};

function label(table: string) {
  return REGISTER_LABELS[table] ?? table;
}

export function PendingEditRequests() {
  const fetchPending = useServerFn(listPendingEdits);
  const fetchLog = useServerFn(listEditLog);

  const { data: pending } = useQuery({
    queryKey: ["pending-edit-requests"],
    queryFn: () => fetchPending({}),
    refetchInterval: 15_000,
  });

  const { data: log } = useQuery({
    queryKey: ["edit-request-log"],
    queryFn: () => fetchLog({}),
    refetchInterval: 60_000,
  });

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Pending edit requests
      </h2>

      {(pending ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          No staff member is waiting for an edit approval right now.
        </p>
      ) : (
        <ul className="space-y-3">
          {(pending ?? []).map((req) => (
            <li
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{label(req.table_name)}</p>
                <p className="text-xs text-muted-foreground">
                  {req.requested_by_name ? `Requested by ${req.requested_by_name} · ` : ""}
                  {new Date(req.requested_at).toLocaleTimeString()} · expires{" "}
                  {new Date(req.expires_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Read out this code
                </p>
                <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                  {req.code}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(log ?? []).length > 0 ? (
        <details className="mt-4 rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Edit request audit trail
          </summary>
          <ul className="mt-3 space-y-2">
            {(log ?? []).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{label(row.table_name)}</span>
                <span className="text-xs text-muted-foreground">
                  {row.requested_by_name ? `${row.requested_by_name} · ` : ""}
                  {new Date(row.requested_at).toLocaleString()} · {row.status}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
