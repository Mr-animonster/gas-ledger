import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const headerSchema = z.object({
  invoice_no: z.string().min(1, "Invoice number is required"),
  invoice_date: dateOrNull.default(null),
  transporter: z.string().nullable().default(null),
  truck_no: z.string().nullable().default(null),
  coming_from: z.string().nullable().default(null),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_cylinders: z.number().int().min(0).default(0),
  godown_keeper_signature: z.string().nullable().default(null),
  proprietor_partner_signature: z.string().nullable().default(null),
  filled_by: z.string().uuid().nullable().default(null),
});

const lineSchema = z.object({
  s_no: z.number().int().min(1),
  cylinder_type_id: z.string().uuid().nullable().default(null),
  tare_weight: z.number().default(0),
  gross_weight: z.number().default(0),
  observed_weight: z.number().default(0),
  dpt_date: dateOrNull.default(null),
  sealing_condition: z.enum(["OK", "Damaged"]).default("OK"),
  leaky_body_bung: z.enum(["None", "Body", "Bung"]).default("None"),
  remarks: z.string().nullable().default(null),
});

export const listSqc = createServerFn({ method: "POST" }).handler(async () => {
  const { listSqcEntries } = await import("./sqc.server");
  return listSqcEntries();
});

export const getSqc = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { getSqcEntry } = await import("./sqc.server");
    return getSqcEntry(data.id);
  });

export const getSqcTolerance = createServerFn({ method: "POST" }).handler(async () => {
  const { getToleranceGrams } = await import("./sqc.server");
  return { toleranceGrams: await getToleranceGrams() };
});

export const saveSqc = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        header: headerSchema,
        items: z.array(lineSchema),
        lock: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveSqcEntry } = await import("./sqc.server");
    return saveSqcEntry(data);
  });
