import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getRegisterExport } from "@/lib/register-export.functions";
import { REGISTER_EXPORTS, type RegisterKey } from "@/lib/register-export-config";

function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const now = new Date(Date.now() - days * 86_400_000);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function ExportPdfButton({ register }: { register: RegisterKey }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(daysAgoISO(6));
  const [to, setTo] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const fetchExport = useServerFn(getRegisterExport);
  const config = REGISTER_EXPORTS[register];

  async function generate() {
    if (from > to) {
      toast.error("The start date must be on or before the end date.");
      return;
    }
    setBusy(true);
    try {
      const payload = await fetchExport({ data: { register, from, to } });
      if (payload.rows.length === 0) {
        toast.error("No entries in that date range.");
        return;
      }
      const { downloadRegisterPdf } = await import("@/lib/register-pdf");
      downloadRegisterPdf(payload);
      toast.success("PDF generated.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 shrink-0 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary"
      >
        Generate PDF
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 space-y-3 rounded-xl border border-border bg-card p-4 shadow-lg">
          <div>
            <p className="text-sm font-semibold text-foreground">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {config.orientation === "landscape" ? "Landscape" : "Portrait"} A4 · repeated header
              on every page
            </p>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <input
              type="date"
              className={inputClass}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <input
              type="date"
              className={inputClass}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={generate}
              className="h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Generating…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
