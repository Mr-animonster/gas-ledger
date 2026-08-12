import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listEntryHistory } from "@/lib/edit-requests.functions";

function prettyField(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EditedBadge({
  tableName,
  entryId,
  visible = true,
}: {
  tableName: string;
  entryId: string;
  visible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fetchHistory = useServerFn(listEntryHistory);

  const { data, isLoading } = useQuery({
    queryKey: ["entry-history", tableName, entryId],
    queryFn: () => fetchHistory({ data: { tableName, entryId } }),
    enabled: open,
  });

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="This entry was edited after locking — view change history"
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-400"
      >
        Edited
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">Change history</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                Close
              </button>
            </div>
            {isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            ) : (data ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No changes recorded.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {(data ?? []).map((row) => (
                  <li key={row.id} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-foreground">
                      {prettyField(row.field_name)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="line-through">{row.old_value ?? "—"}</span>{" "}
                      <span aria-hidden>→</span>{" "}
                      <span className="font-medium text-foreground">{row.new_value ?? "—"}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(row.edited_at).toLocaleString()}
                      {row.edited_by_name ? ` · ${row.edited_by_name}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
