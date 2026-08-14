/**
 * Client-safe description of every register that can be exported to PDF:
 * which table it reads, which column holds the business date, the column
 * layout, and how a database row maps onto printable cells.
 */

export type AppRoleName = "distributor" | "godown" | "computer_staff";

export type RegisterKey =
  | "stock"
  | "sqc"
  | "sales"
  | "installation"
  | "connection"
  | "defective"
  | "complaint"
  | "wage"
  | "inspection";

type Row = Record<string, unknown>;

export type RegisterExportConfig = {
  key: RegisterKey;
  label: string;
  orientation: "landscape" | "portrait";
  table: string;
  dateColumn: string;
  select: string;
  roles: AppRoleName[];
  columns: string[];
  map: (row: Row) => string[];
};

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const n = (v: unknown) => (v === null || v === undefined ? "0" : String(v));
const money = (v: unknown) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yn = (v: unknown) => (v ? "Yes" : "No");
const pkg = (row: Row) => s((row["package_codes"] as Row | null)?.["code"]);
const staffName = (row: Row, key: string) => s((row[key] as Row | null)?.["name"]);

export const REGISTER_EXPORTS: Record<RegisterKey, RegisterExportConfig> = {
  stock: {
    key: "stock",
    label: "Daily Stock Register",
    orientation: "landscape",
    table: "stock_entries",
    dateColumn: "stock_date",
    select: "*, package_codes:package_code_id(code, sort_order), staff:filled_by(name)",
    roles: ["distributor", "godown"],
    columns: [
      "Date",
      "Package",
      "Op. GF",
      "Op. GE",
      "Op. DF",
      "Op. DE",
      "Recd. Plant",
      "Refill Sale",
      "SV New",
      "SV Recon.",
      "SV Addl.",
      "Recd. Cons. Refill",
      "Recd. Cons. TV",
      "Ret. Plant",
      "Def. to Plant",
      "New Def.",
      "Cl. GF",
      "Cl. GE",
      "Cl. DF",
      "Cl. DE",
      "Filled By",
    ],
    map: (r) => [
      s(r["stock_date"]),
      pkg(r),
      n(r["opening_good_filled"]),
      n(r["opening_good_empty"]),
      n(r["opening_defective_filled"]),
      n(r["opening_defective_empty"]),
      n(r["received_from_plant"]),
      n(r["refill_sale"]),
      n(r["sv_new_issues"]),
      n(r["sv_reconnection_issues"]),
      n(r["sv_additional_issues"]),
      n(r["received_from_consumer_refill"]),
      n(r["received_from_consumer_against_tv"]),
      n(r["returned_to_plant"]),
      n(r["defective_item_returned_to_plant"]),
      n(r["newly_identified_defective"]),
      n(r["closing_good_filled"]),
      n(r["closing_good_empty"]),
      n(r["closing_defective_filled"]),
      n(r["closing_defective_empty"]),
      staffName(r, "staff"),
    ],
  },

  sqc: {
    key: "sqc",
    label: "SQC Register",
    orientation: "landscape",
    table: "sqc_entries",
    dateColumn: "received_date",
    select:
      "*, staff:filled_by(name), sqc_line_items(s_no, tare_weight, gross_weight, observed_weight, variation, dpt_date, sealing_condition, leaky_body_bung, remarks, package_codes:cylinder_type_id(code))",
    roles: ["distributor", "godown"],
    columns: [
      "Recd. Date",
      "Invoice",
      "Inv. Date",
      "Truck",
      "From",
      "Total Cyl.",
      "S.No",
      "Type",
      "Tare",
      "Gross",
      "Observed",
      "Variation",
      "DPT",
      "Seal",
      "Leak",
      "Remarks",
      "Filled By",
    ],
    map: (r) => [
      s(r["received_date"]),
      s(r["invoice_no"]),
      s(r["invoice_date"]),
      s(r["truck_no"]),
      s(r["coming_from"]),
      n(r["total_cylinders"]),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      staffName(r, "staff"),
    ],
  },

  sales: {
    key: "sales",
    label: "Sales Register",
    orientation: "landscape",
    table: "sales_entries",
    dateColumn: "sale_date",
    select:
      "*, package_codes:package_code_id(code), staff:issued_by(name), sales_batches:batch_id(batch_date, locked, locked_at, booklet_page_photo_ref)",
    roles: ["distributor", "computer_staff"],
    columns: [
      "Date",
      "Cash Memo",
      "Consumer No",
      "Consumer",
      "Item",
      "Package",
      "Qty",
      "Rate",
      "Amount",
      "Payment",
      "PDC",
      "Issued By",
    ],
    map: (r) => [
      s(r["sale_date"]),
      s(r["cash_memo_no"]),
      s(r["consumer_no"]),
      s(r["consumer_name"]),
      s(r["item"]),
      pkg(r),
      n(r["quantity"]),
      money(r["rate"]),
      money(r["amount_charged"]),
      s(r["payment_mode"]),
      yn(r["pdc_done"]),
      staffName(r, "staff"),
    ],
  },

  installation: {
    key: "installation",
    label: "Installation & ARB Register",
    orientation: "landscape",
    table: "installation_arb_entries",
    dateColumn: "entry_date",
    select: "*, staff:filled_by(name)",
    roles: ["distributor", "computer_staff"],
    columns: [
      "Date",
      "Sr.",
      "Consumer No",
      "Consumer",
      "Mobile",
      "SV Date",
      "Instl. Date",
      "Stove",
      "Lighter",
      "Apron",
      "Trolley",
      "Other ARB",
      "Bill",
      "Receipt",
      "Filled By",
    ],
    map: (r) => [
      s(r["entry_date"]),
      s(r["sr_no"]),
      s(r["consumer_no"]),
      s(r["consumer_name"]),
      s(r["mobile_no"]),
      s(r["sv_date"]),
      s(r["installation_date"]),
      s(r["type_of_stove_sold"]),
      yn(r["lighter"]),
      yn(r["apron"]),
      yn(r["trolley"]),
      s(r["other_arb"]),
      money(r["total_bill_amount"]),
      money(r["total_receipt_amount"]),
      staffName(r, "staff"),
    ],
  },

  connection: {
    key: "connection",
    label: "Connection / SV Register",
    orientation: "landscape",
    table: "connection_sv_entries",
    dateColumn: "entry_date",
    select: "*, package_codes:cylinder_dpr_type_id(code), staff:processed_by(name)",
    roles: ["distributor", "computer_staff"],
    columns: [
      "Date",
      "Sr.",
      "Type",
      "Consumer No",
      "Consumer",
      "Scheme",
      "Aadhaar ••",
      "Bank A/C ••",
      "Elig. Chk",
      "Dup. Chk",
      "Cyl./DPR",
      "Count",
      "TV State",
      "Cash Memo",
      "Processed By",
    ],
    map: (r) => [
      s(r["entry_date"]),
      s(r["sr_no"]),
      s(r["type"]),
      s(r["consumer_no"]),
      s(r["consumer_name"]),
      s(r["scheme"]),
      s(r["aadhaar_last4"]),
      s(r["bank_ac_last4"]),
      yn(r["eligibility_check_done"]),
      yn(r["duplicate_household_check_done"]),
      pkg(r),
      n(r["cylinder_dpr_count"]),
      s(r["filled_empty_at_tv_retrieval"]),
      s(r["cash_memo_no"]),
      staffName(r, "staff"),
    ],
  },

  defective: {
    key: "defective",
    label: "Defective Cylinder / DPR Register",
    orientation: "landscape",
    table: "defective_entries",
    dateColumn: "date_of_identification",
    select: "*, package_codes:cylinder_dpr_type_id(code), staff:filled_by(name)",
    roles: ["distributor", "godown"],
    columns: [
      "Date",
      "Sr.",
      "Type",
      "Cyl. Sr. No",
      "Batch",
      "Seal",
      "Defect",
      "Source",
      "TT No",
      "Consumer",
      "PRCN",
      "PRCN Sent",
      "PRCN Recd.",
      "Plant",
      "Sent On",
      "Repl. Recd.",
      "Filled By",
    ],
    map: (r) => [
      s(r["date_of_identification"]),
      s(r["sr_no"]),
      pkg(r),
      s(r["cylinder_dpr_sr_no"]),
      s(r["batch_no"]),
      s(r["seal_condition"]),
      s(r["nature_of_defect"]),
      s(r["source"]),
      s(r["tt_no"]),
      s(r["consumer_name"]),
      s(r["prcn"]),
      s(r["prcn_sent_on"]),
      yn(r["prcn_received"]),
      s(r["plant_name"]),
      s(r["sent_to_plant_on"]),
      s(r["received_replacement_stock_on"]),
      staffName(r, "staff"),
    ],
  },

  complaint: {
    key: "complaint",
    label: "Complaint Register",
    orientation: "portrait",
    table: "complaint_entries",
    dateColumn: "entry_date",
    select: "*, staff:resolved_by(name)",
    roles: ["distributor", "computer_staff"],
    columns: [
      "Date",
      "Sr.",
      "Consumer",
      "Contact",
      "Nature",
      "Complaint",
      "Action Taken",
      "Resolved On",
      "Resolved By",
    ],
    map: (r) => [
      s(r["entry_date"]),
      s(r["sr_no"]),
      s(r["consumer_name"]),
      s(r["consumer_contact"]),
      s(r["nature"]),
      s(r["complaint_text"]),
      s(r["action_taken"]),
      s(r["resolved_date"]),
      staffName(r, "staff"),
    ],
  },

  wage: {
    key: "wage",
    label: "Staff Wage Register",
    orientation: "landscape",
    table: "wage_entries",
    dateColumn: "month_year",
    select: "*",
    roles: ["distributor"],
    columns: [
      "Month",
      "Staff",
      "Role",
      "Days",
      "Gross",
      "PF",
      "ESI",
      "Net Paid",
      "Mode",
      "Paid On",
      "Remarks",
    ],
    map: (r) => [
      s(r["month_year"]),
      s(r["staff_name"]),
      s(r["role"]),
      n(r["days_worked"]),
      money(r["gross_wage"]),
      money(r["pf_applicable"]),
      money(r["esi_applicable"]),
      money(r["net_paid"]),
      s(r["payment_mode"]),
      s(r["payment_date"]),
      s(r["remarks"]),
    ],
  },

  inspection: {
    key: "inspection",
    label: "Inspection Report Log",
    orientation: "portrait",
    table: "inspection_entries",
    dateColumn: "inspection_date",
    select: "*",
    roles: ["distributor"],
    columns: [
      "Date",
      "Officer",
      "Type",
      "Irregularity",
      "SCN",
      "Reply",
      "Speaking Order",
      "Fine",
      "Report Filed",
      "Ref",
    ],
    map: (r) => [
      s(r["inspection_date"]),
      s(r["officer_name_designation"]),
      s(r["type"]),
      s(r["irregularity_category"]),
      s(r["scn_date"]),
      s(r["reply_date"]),
      s(r["speaking_order_date"]),
      money(r["fine_amount"]),
      yn(r["report_filed"]),
      s(r["report_file_ref"]),
    ],
  },
};

export type RegisterExportPayload = {
  key: RegisterKey;
  title: string;
  orientation: "landscape" | "portrait";
  agencyName: string;
  from: string;
  to: string;
  columns: string[];
  rows: string[][];
  /** Per-row authenticity trail, aligned with `rows`. */
  trail: { created_at: string | null; locked_at: string | null }[];
  edits: {
    entryLabel: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    editedAt: string;
    requestRef: string | null;
  }[];
};
