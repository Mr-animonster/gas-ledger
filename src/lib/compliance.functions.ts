import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getComplianceDay = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ date: dateStr }).parse(input))
  .handler(async ({ data }) => {
    const { getDayStatus } = await import("./compliance.server");
    return getDayStatus(data.date);
  });

export const getComplianceHeatmap = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ from: dateStr, to: dateStr }).parse(input))
  .handler(async ({ data }) => {
    const { getHeatmap } = await import("./compliance.server");
    return getHeatmap(data.from, data.to);
  });
