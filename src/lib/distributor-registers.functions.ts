import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const num = z.coerce.number().default(0);

const wageSchema = z.object({
  month_year: z.string().regex(/^\d{4}-\d{2}$/),
  staff_id: z.string().uuid().nullable().default(null),
  staff_name: z.string().nullable().default(null),
  role: z.enum(["godown", "computer_staff", "distributor"]).nullable().default(null),
  days_worked: num,
  gross_wage: num,
  pf_applicable: num,
  esi_applicable: num,
  net_paid: num,
  net_paid_override: z.boolean().default(false),
  payment_mode: z.string().nullable().default(null),
  payment_date: dateStr.nullable().default(null),
  remarks: z.string().nullable().default(null),
  proprietor_signature: z.string().nullable().default(null),
  locked: z.boolean().default(false),
});

const inspectionSchema = z.object({
  inspection_date: dateStr,
  officer_name_designation: z.string().nullable().default(null),
  type: z.enum(["Routine", "Surprise", "Investigation"]).default("Routine"),
  irregularity_category: z.enum(["Critical", "Major", "Minor", "None"]).default("None"),
  scn_date: dateStr.nullable().default(null),
  reply_date: dateStr.nullable().default(null),
  speaking_order_date: dateStr.nullable().default(null),
  fine_amount: num,
  report_filed: z.boolean().default(false),
  report_file_ref: z.string().nullable().default(null),
  locked: z.boolean().default(false),
});

export const listWages = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ month: z.string().nullable().default(null) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { listWageEntries } = await import("./distributor-registers.server");
    return listWageEntries(data.month);
  });

export const saveWage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid().nullable().default(null), entry: wageSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { saveWageEntry } = await import("./distributor-registers.server");
    return saveWageEntry(data);
  });

export const listInspections = createServerFn({ method: "POST" }).handler(async () => {
  const { listInspectionEntries } = await import("./distributor-registers.server");
  return listInspectionEntries();
});

export const saveInspection = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid().nullable().default(null), entry: inspectionSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveInspectionEntry } = await import("./distributor-registers.server");
    return saveInspectionEntry(data);
  });
