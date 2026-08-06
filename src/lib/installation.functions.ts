import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const entrySchema = z.object({
  consumer_id: z.string().uuid().nullable().default(null),
  consumer_no: z.string().nullable().default(null),
  consumer_name: z.string().nullable().default(null),
  mobile_no: z.string().nullable().default(null),
  sv_date: dateOrNull.default(null),
  installation_date: dateOrNull.default(null),
  type_of_stove_sold: z.string().nullable().default(null),
  lighter: z.boolean().default(false),
  apron: z.boolean().default(false),
  trolley: z.boolean().default(false),
  other_arb: z.string().nullable().default(null),
  total_bill_amount: z.number().min(0).default(0),
  total_receipt_amount: z.number().min(0).default(0),
  customer_sign: z.string().nullable().default(null),
  distributor_sign: z.string().nullable().default(null),
  filled_by: z.string().uuid().nullable().default(null),
});

export const listInstallations = createServerFn({ method: "POST" }).handler(async () => {
  const { listInstallationEntries } = await import("./installation.server");
  return listInstallationEntries();
});

export const saveInstallation = createServerFn({ method: "POST" })
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
    const { saveInstallationEntry } = await import("./installation.server");
    return saveInstallationEntry(data);
  });

export const saveConsumer = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        consumer_no: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(120),
        mobile_no: z.string().trim().max(20).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createConsumerRecord } = await import("./installation.server");
    return createConsumerRecord(data);
  });
