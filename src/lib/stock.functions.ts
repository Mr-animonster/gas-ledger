import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const valuesSchema = z
  .object({
    received_from_plant: z.number(),
    refill_sale: z.number(),
    sv_new_issues: z.number(),
    sv_reconnection_issues: z.number(),
    sv_additional_issues: z.number(),
    received_from_consumer_refill: z.number(),
    received_from_consumer_against_tv: z.number(),
    returned_to_plant: z.number(),
    defective_item_returned_to_plant: z.number(),
  })
  .partial();

export const getStockDay = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ stockDate: dateSchema }).parse(input))
  .handler(async ({ data }) => {
    const { loadStockDay } = await import("./stock.server");
    return loadStockDay(data.stockDate);
  });

export const saveStockEntries = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        stockDate: dateSchema,
        filledBy: z.string().uuid().nullable().default(null),
        rows: z.array(
          z.object({ package_code_id: z.string().uuid(), values: valuesSchema }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveStockDay } = await import("./stock.server");
    return saveStockDay(data);
  });
