import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const roleSchema = z.enum(["distributor", "godown", "computer_staff"]);

export const getSessionState = createServerFn({ method: "GET" }).handler(async () => {
  const { readSession } = await import("./agency.server");
  return readSession();
});

export const loginAgency = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ agencyId: z.string().min(1), password: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { loginWithAgencyCredentials } = await import("./agency.server");
    return loginWithAgencyCredentials(data.agencyId, data.password);
  });

export const logoutAgency = createServerFn({ method: "POST" }).handler(async () => {
  const { clearAppSession } = await import("./agency.server");
  await clearAppSession();
  return { ok: true as const };
});

export const chooseStaffRole = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ role: roleSchema }).parse(input))
  .handler(async ({ data }) => {
    const { setStaffRole } = await import("./agency.server");
    return setStaffRole(data.role);
  });

export const requestDistributorOtp = createServerFn({ method: "POST" }).handler(async () => {
  const { createDistributorOtp } = await import("./agency.server");
  return createDistributorOtp();
});

export const confirmDistributorOtp = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(4) }).parse(input))
  .handler(async ({ data }) => {
    const { verifyDistributorOtp } = await import("./agency.server");
    return verifyDistributorOtp(data.code);
  });

export const getActiveStaff = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ roles: z.array(roleSchema).default([]) }).parse(input))
  .handler(async ({ data }) => {
    const { listActiveStaff } = await import("./agency.server");
    return listActiveStaff(data.roles);
  });
