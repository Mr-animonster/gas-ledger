import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { requestEntryEdit, verifyEntryEditOtp } from "@/lib/edit-requests.functions";

type Props = {
  tableName: string;
  entryId: string;
  coveredTable?: string | null;
  coveredIds?: string[];
  requestedBy?: string | null;
  onUnlocked: () => void;
  className?: string;
  label?: string;
};

export function RequestEditButton({
  tableName,
  entryId,
  coveredTable = null,
  coveredIds = [],
  requestedBy = null,
  onUnlocked,
  className,
  label = "Request Edit",
}: Props) {
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const request = useServerFn(requestEntryEdit);
  const verify = useServerFn(verifyEntryEditOtp);

  const start = useMutation({
    mutationFn: () =>
      request({ data: { tableName, entryId, coveredTable, coveredIds, requestedBy } }),
    onSuccess: (res) => {
      setRequestId(res.requestId);
      setSentTo(res.sentTo ?? null);
      setCode("");
      setOpen(true);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const confirm = useMutation({
    mutationFn: () => verify({ data: { requestId: requestId!, code } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(
          res.reason === "expired"
            ? "That code has expired. Request a new one."
            : "That code is not correct.",
        );
        return;
      }
      toast.success("Unlocked for editing — it will re-lock when you save.");
      setOpen(false);
      setRequestId(null);
      onUnlocked();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => start.mutate()}
        disabled={start.isPending}
        className={
          className ??
          "h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        }
      >
        {start.isPending ? "Requesting…" : label}
      </button>

      {open && requestId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="text-base font-bold text-foreground">Enter distributor code</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A 6-digit code was raised for the distributor
              {sentTo ? ` (${sentTo})` : ""}. It appears on their dashboard and is valid for 5
              minutes.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              aria-label="Edit approval code"
              className="mt-4 h-14 w-full rounded-lg border border-input bg-background px-3 text-center text-2xl tracking-[0.4em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-12 flex-1 rounded-lg border border-input bg-background text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={code.length < 6 || confirm.isPending}
                onClick={() => confirm.mutate()}
                className="h-12 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {confirm.isPending ? "Checking…" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
