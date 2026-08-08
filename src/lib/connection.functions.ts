import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const entrySchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["New", "Reconnection", "Additional", "TV"]),
  consumer_id: z.string().uuid().nullable().default(null),
  consumer_no: z.string().nullable().default(null),
  consumer_name: z.string().nullable().default(null),
  scheme: z.enum(["Regular", "PMUY", "Extended PMUY", "PMUY-2"]).default("Regular"),
  aadhaar_last4: z
    .string()
    .regex(/^\d{0,4}$/)
    .nullable()
    .default(null),
  bank_ac_last4: z
    .string()
    .regex(/^\d{0,4}$/)
    .nullable()
    .default(null),
  eligibility_check_done: z.boolean().default(false),
  duplicate_household_check_done: z.boolean().default(false),
  cylinder_dpr_type_id: z.string().uuid().nullable().default(null),
  cylinder_dpr_count: z.number().int().min(0).max(999).default(0),
  filled_empty_at_tv_retrieval: z.enum(["Filled", "Empty", "N/A"]).default("N/A"),
  cash_memo_no: z.number().int().nullable().default(null),
  processed_by: z.string().uuid().nullable().default(null),
});

export const listConnections = createServerFn({ method: "POST" }).handler(async () => {
  const { listConnectionEntries } = await import("./connection.server");
  return listConnectionEntries();
});

export const listCashMemos = createServerFn({ method: "POST" }).handler(async () => {
  const { listRecentCashMemos } = await import("./connection.server");
  return listRecentCashMemos();
});

export const saveConnection = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        entry: entrySchema,
        lock: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveConnectionEntry } = await import("./connection.server");
    return saveConnectionEntry(data);
  });
