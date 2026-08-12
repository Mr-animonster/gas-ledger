import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { EditedBadge } from "@/components/EditedBadge";
import { RequestEditButton } from "@/components/RequestEditButton";
import { listEditedIds } from "@/lib/edit-requests.functions";

/** Ids in a register that carry edit history, for the "Edited" badge. */
export function useEditedIds(tableName: string) {
  const fetchIds = useServerFn(listEditedIds);
  const { data } = useQuery({
    queryKey: ["edited-ids", tableName],
    queryFn: () => fetchIds({ data: { tableName } }),
  });
  return new Set(data ?? []);
}

type Props = {
  tableName: string;
  entryId: string;
  locked: boolean;
  edited?: boolean;
  requestedBy?: string | null;
  onEdit?: () => void;
  onUnlocked: () => void;
};

/** Row-level lock state: Edit when open, OTP-gated Request Edit when locked. */
export function EntryLockCell({
  tableName,
  entryId,
  locked,
  edited = false,
  requestedBy = null,
  onEdit,
  onUnlocked,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {locked ? (
        <RequestEditButton
          tableName={tableName}
          entryId={entryId}
          requestedBy={requestedBy}
          onUnlocked={onUnlocked}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs font-semibold text-primary hover:bg-secondary disabled:opacity-60"
        />
      ) : onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-input px-2 py-1 text-xs font-semibold text-primary hover:bg-secondary"
        >
          Edit
        </button>
      ) : (
        <span className="text-xs font-semibold text-primary">Draft</span>
      )}
      <EditedBadge tableName={tableName} entryId={entryId} visible={edited} />
    </div>
  );
}
