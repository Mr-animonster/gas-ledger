import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const entrySchema = z.object({
  entry_date: dateStr,
  consumer_id: z.string().uuid().nullable().default(null),
  consumer_no: z.string().nullable().default(null),
  consumer_name: z.string().nullable().default(null),
  consumer_contact: z.string().nullable().default(null),
  complaint_text: z.string().default(""),
  nature: z.enum(["Delay", "Leakage", "Behaviour", "Other"]).default("Other"),
  action_taken: z.string().nullable().default(null),
  resolved_date: dateStr.nullable().default(null),
  resolved_by: z.string().uuid().nullable().default(null),
});

export const listComplaints = createServerFn({ method: "POST" }).handler(async () => {
  const { listComplaintEntries } = await import("./complaint.server");
  return listComplaintEntries();
});

export const saveComplaint = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        entry: entrySchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveComplaintEntry } = await import("./complaint.server");
    return saveComplaintEntry(data);
  });
