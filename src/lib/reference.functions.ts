import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPackageCodes = createServerFn({ method: "POST" }).handler(async () => {
  const { listPackageCodes } = await import("./reference.server");
  return listPackageCodes();
});

export const searchConsumers = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ term: z.string().default("") }).parse(input))
  .handler(async ({ data }) => {
    const { searchConsumersByTerm } = await import("./reference.server");
    return searchConsumersByTerm(data.term);
  });
