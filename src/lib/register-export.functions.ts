import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.object({
  register: z.enum([
    "stock",
    "sqc",
    "sales",
    "installation",
    "connection",
    "defective",
    "complaint",
    "wage",
    "inspection",
  ]),
  from: dateStr,
  to: dateStr,
});

export const getRegisterExport = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const { buildRegisterExport } = await import("./register-export.server");
    return buildRegisterExport(data.register, data.from, data.to);
  });
