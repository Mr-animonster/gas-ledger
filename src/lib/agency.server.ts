import { useSession } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AppRole = "distributor" | "godown" | "computer_staff";

export type AppSession = {
  authed?: boolean;
  role?: AppRole;
  agencyName?: string;
};

export function getAppSession() {
  return useSession<AppSession>({
    password: process.env["SESSION_SECRET"]!,
    name: "lpg-register-session",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none", path: "/" },
  });
}

export async function readSession() {
  const session = await getAppSession();
  return {
    authed: session.data.authed === true,
    role: session.data.role ?? null,
    agencyName: session.data.agencyName ?? "LPG Agency",
  };
}

export async function loginWithAgencyCredentials(agencyId: string, password: string) {
  const { data, error } = await supabaseAdmin
    .from("distributor_settings")
    .select("agency_id, password, agency_name")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Could not verify credentials right now.");
  if (
    !data ||
    data.agency_id.trim().toLowerCase() !== agencyId.trim().toLowerCase() ||
    data.password !== password
  ) {
    return { ok: false as const };
  }

  const session = await getAppSession();
  await session.clear();
  await session.update({ authed: true, agencyName: data.agency_name });
  return { ok: true as const, agencyName: data.agency_name };
}

export async function clearAppSession() {
  const session = await getAppSession();
  await session.clear();
}

export async function setStaffRole(role: AppRole) {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (role === "distributor") throw new Error("Distributor access requires verification");
  await session.update({ ...session.data, role });
  return { ok: true as const };
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `••••••${digits.slice(-4)}` : phone;
}

export async function createDistributorOtp() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");

  const { data: settings, error } = await supabaseAdmin
    .from("distributor_settings")
    .select("phone_number")
    .limit(1)
    .maybeSingle();

  if (error || !settings) throw new Error("Distributor phone number is not configured.");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin.from("distributor_otps").insert({
    code,
    phone_number: settings.phone_number,
    expires_at: expiresAt,
  });
  if (insertError) throw new Error("Could not generate a verification code.");

  // SMS delivery is not wired up yet — the code is surfaced in the UI for testing.
  return {
    ok: true as const,
    maskedPhone: maskPhone(settings.phone_number),
    expiresAt,
    devCode: code,
  };
}

export async function verifyDistributorOtp(code: string) {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");

  const { data, error } = await supabaseAdmin
    .from("distributor_otps")
    .select("id, code, expires_at, consumed_at")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Could not verify the code right now.");
  if (!data || data.code !== code.trim()) return { ok: false as const };

  await supabaseAdmin
    .from("distributor_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);

  await session.update({ ...session.data, role: "distributor" });
  return { ok: true as const };
}

export async function listActiveStaff(roles: AppRole[]) {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");

  let query = supabaseAdmin.from("staff").select("id, name, role").eq("active", true).order("name");

  if (roles.length > 0) query = query.in("role", roles);

  const { data, error } = await query;
  if (error) throw new Error("Could not load staff list.");
  return data ?? [];
}
