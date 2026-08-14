import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { RegisterExportPayload } from "./register-export-config";

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
}

/** Renders a register export payload to a PDF and triggers a download. */
export function downloadRegisterPdf(payload: RegisterExportPayload) {
  const doc = new jsPDF({ orientation: payload.orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });

  const head = [[...payload.columns, "Entered At", "Locked At"]];
  const body = payload.rows.map((cells, i) => [
    ...cells,
    fmt(payload.trail[i]?.created_at ?? null),
    fmt(payload.trail[i]?.locked_at ?? null),
  ]);

  const drawChrome = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(payload.agencyName, 28, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(payload.title, 28, 45);
    doc.text(`Period: ${payload.from} to ${payload.to}`, pageWidth - 28, 45, { align: "right" });
    doc.setDrawColor(180);
    doc.line(28, 52, pageWidth - 28, 52);

    doc.setFontSize(7.5);
    doc.setTextColor(90);
    doc.text(`Digitally maintained record — generated on ${generatedAt}`, 28, pageHeight - 16);
    doc.text(
      `Page ${doc.getCurrentPageInfo().pageNumber}`,
      pageWidth - 28,
      pageHeight - 16,
      { align: "right" },
    );
    doc.setTextColor(0);
  };

  autoTable(doc, {
    head,
    body: body.length > 0 ? body : [[...head[0]!.map(() => "—")]],
    startY: 62,
    margin: { top: 62, bottom: 30, left: 20, right: 20 },
    styles: {
      fontSize: payload.columns.length > 14 ? 5.6 : 7,
      cellPadding: 2,
      overflow: "linebreak",
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: payload.columns.length > 14 ? 5.6 : 7 },
    tableWidth: "auto",
    horizontalPageBreak: false,
    showHead: "everyPage",
    didDrawPage: drawChrome,
  });

  if (payload.edits.length > 0) {
    doc.addPage(undefined, payload.orientation);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Appendix — Approved edit history", 28, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Entries below were amended after locking, under a distributor-approved edit request.",
      28,
      84,
    );
    autoTable(doc, {
      head: [["Entry", "Field", "Previous value", "New value", "Edited at", "Edit request"]],
      body: payload.edits.map((e) => [
        e.entryLabel,
        e.field.replace(/_/g, " "),
        e.oldValue ?? "—",
        e.newValue ?? "—",
        fmt(e.editedAt),
        e.requestRef ?? "—",
      ]),
      startY: 96,
      margin: { top: 62, bottom: 30, left: 20, right: 20 },
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7 },
      showHead: "everyPage",
      didDrawPage: drawChrome,
    });
  }

  doc.save(`${payload.key}-register-${payload.from}-to-${payload.to}.pdf`);
}
