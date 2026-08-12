import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tableName = z.string().min(1);

export const requestEntryEdit = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        tableName,
        entryId: z.string().uuid(),
        coveredTable: tableName.nullable().default(null),
        coveredIds: z.array(z.string().uuid()).default([]),
        requestedBy: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createEditRequest } = await import("./edit-requests.server");
    return createEditRequest(data);
  });

export const verifyEntryEditOtp = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ requestId: z.string().uuid(), code: z.string().min(4) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { verifyEditRequest } = await import("./edit-requests.server");
    return verifyEditRequest(data);
  });

export const listPendingEdits = createServerFn({ method: "POST" }).handler(async () => {
  const { listPendingEditRequests } = await import("./edit-requests.server");
  return listPendingEditRequests();
});

export const listEditLog = createServerFn({ method: "POST" }).handler(async () => {
  const { listEditRequestLog } = await import("./edit-requests.server");
  return listEditRequestLog();
});

export const listEditedIds = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ tableName }).parse(input))
  .handler(async ({ data }) => {
    const { listEditedEntryIds } = await import("./edit-requests.server");
    return listEditedEntryIds(data.tableName);
  });

export const listEntryHistory = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ tableName, entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { listEntryEditHistory } = await import("./edit-requests.server");
    return listEntryEditHistory(data.tableName, data.entryId);
  });
