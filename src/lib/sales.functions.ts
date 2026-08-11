import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const rowSchema = z.object({
  id: z.string().uuid().nullable().default(null),
  consumer_id: z.string().uuid().nullable().default(null),
  consumer_no: z.string().nullable().default(null),
  consumer_name: z.string().nullable().default(null),
  item: z.enum(["Refill", "ARB-Other"]).default("Refill"),
  package_code_id: z.string().uuid().nullable().default(null),
  quantity: z.number().int().min(0).default(1),
  rate: z.number().min(0).default(0),
  amount_charged: z.number().min(0).default(0),
  payment_mode: z.enum(["Cash", "UPI", "Card"]).default("Cash"),
  pdc_done: z.boolean().default(false),
});

export const getSalesDayData = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ date: dateSchema }).parse(input))
  .handler(async ({ data }) => {
    const { getSalesDay } = await import("./sales.server");
    return getSalesDay(data.date);
  });

export const saveSalesBatchFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        batchId: z.string().uuid().nullable().default(null),
        date: dateSchema,
        issued_by: z.string().uuid().nullable().default(null),
        rows: z.array(rowSchema).min(1, "Add at least one cash memo row"),
        photoDataUrl: z.string().nullable().default(null),
        lock: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveSalesBatch } = await import("./sales.server");
    return saveSalesBatch(data);
  });

export const lockSalesDayFn = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ date: dateSchema }).parse(input))
  .handler(async ({ data }) => {
    const { lockSalesDay } = await import("./sales.server");
    return lockSalesDay(data.date);
  });
