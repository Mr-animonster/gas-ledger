import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .default(null);

const entrySchema = z.object({
  date_of_identification: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cylinder_dpr_type_id: z.string().uuid().nullable().default(null),
  cylinder_dpr_sr_no: z.string().nullable().default(null),
  batch_no: z.string().nullable().default(null),
  seal_condition: z.enum(["OK", "Damaged", "N/A"]).default("N/A"),
  nature_of_defect: z.string().nullable().default(null),
  source: z.enum(["Truck", "Consumer"]).default("Consumer"),
  tt_no: z.string().nullable().default(null),
  consumer_id: z.string().uuid().nullable().default(null),
  consumer_no: z.string().nullable().default(null),
  consumer_name: z.string().nullable().default(null),
  consumer_contact: z.string().nullable().default(null),
  prcn: z.string().nullable().default(null),
  prcn_sent_on: nullableDate,
  prcn_received: z.boolean().default(false),
  driver_consumer_signature: z.string().nullable().default(null),
  plant_name: z.string().nullable().default(null),
  sent_to_plant_on: nullableDate,
  received_replacement_stock_on: nullableDate,
  distributor_signature: z.string().nullable().default(null),
  filled_by: z.string().uuid().nullable().default(null),
});

export const listDefectives = createServerFn({ method: "POST" }).handler(async () => {
  const { listDefectiveEntries } = await import("./defective.server");
  return listDefectiveEntries();
});

export const saveDefective = createServerFn({ method: "POST" })
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
    const { saveDefectiveEntry } = await import("./defective.server");
    return saveDefectiveEntry(data);
  });
