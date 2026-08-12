import { createHash, randomInt } from "crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";

export const LOCKABLE_TABLES = [
  "stock_entries",
  "sqc_entries",
  "sales_batches",
  "sales_entries",
  "installation_arb_entries",
  "connection_sv_entries",
  "defective_entries",
  "complaint_entries",
] as const;

export type LockableTable = (typeof LOCKABLE_TABLES)[number];

function assertTable(name: string): asserts name is LockableTable {
  if (!(LOCKABLE_TABLES as readonly string[]).includes(name)) {
    throw new Error("Unknown register.");
  }
}

function hashOtp(code: string) {
  return createHash("sha256").update(`${code}`).digest("hex");
}

async function requireSignedIn() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  return session;
}

async function requireDistributor() {
  const session = await requireSignedIn();
  if (session.data.role !== "distributor") {
    throw new Error("Only the distributor can do this.");
  }
  return session;
}

export async function createEditRequest(input: {
  tableName: string;
  entryId: string;
  coveredIds?: string[];
  coveredTable?: string | null;
  requestedBy?: string | null;
}) {
  await requireSignedIn();
  assertTable(input.tableName);
  if (input.coveredTable) assertTable(input.coveredTable);

  const { data: settings } = await supabaseAdmin
    .from("distributor_settings")
    .select("phone_number")
    .limit(1)
    .maybeSingle();

  const code = String(randomInt(100000, 1000000));

  const { data, error } = await supabaseAdmin
    .from("edit_requests")
    .insert({
      table_name: input.tableName,
      entry_id: input.entryId,
      covered_table: input.coveredTable ?? null,
      covered_ids: input.coveredIds ?? [],
      requested_by: input.requestedBy ?? null,
      otp_hash: hashOtp(code),
      // SMS is not wired up yet — the distributor reads this from their dashboard panel.
      otp_preview: code,
      otp_sent_to: settings?.phone_number ?? null,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select("id, expires_at, otp_sent_to")
    .single();

  if (error || !data) throw new Error("Could not raise an edit request.");

  return {
    ok: true as const,
    requestId: data.id,
    expiresAt: data.expires_at,
    sentTo: data.otp_sent_to,
  };
}

export async function verifyEditRequest(input: { requestId: string; code: string }) {
  await requireSignedIn();

  const { data: req, error } = await supabaseAdmin
    .from("edit_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (error || !req) throw new Error("Edit request not found.");
  if (req.status !== "pending") throw new Error("This request has already been used.");

  if (new Date(req.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from("edit_requests")
      .update({ status: "expired", resolved_at: new Date().toISOString() })
      .eq("id", req.id);
    return { ok: false as const, reason: "expired" as const };
  }

  if (hashOtp(input.code.trim()) !== req.otp_hash) {
    return { ok: false as const, reason: "invalid" as const };
  }

  // Unlock BEFORE approving so the history trigger does not fire on the unlock itself.
  const primary = req.table_name as LockableTable;
  await supabaseAdmin
    .from(primary as "complaint_entries")
    .update({ locked: false, locked_at: null })
    .eq("id", req.entry_id);

  const coveredIds = (req.covered_ids ?? []) as string[];
  if (req.covered_table && coveredIds.length > 0) {
    await supabaseAdmin
      .from(req.covered_table as "complaint_entries")
      .update({ locked: false, locked_at: null })
      .in("id", coveredIds);
  }

  await supabaseAdmin.from("edit_requests").update({ status: "approved" }).eq("id", req.id);

  return { ok: true as const };
}

export async function listPendingEditRequests() {
  await requireDistributor();
  const { data, error } = await supabaseAdmin
    .from("edit_requests")
    .select(
      "id, table_name, entry_id, otp_preview, otp_sent_to, expires_at, requested_at, status, requested_by, staff:requested_by(name)",
    )
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("requested_at", { ascending: false })
    .limit(20);

  if (error) throw new Error("Could not load pending edit requests.");
  return (data ?? []).map((row) => ({
    id: row.id,
    table_name: row.table_name,
    entry_id: row.entry_id,
    code: row.otp_preview,
    sent_to: row.otp_sent_to,
    expires_at: row.expires_at,
    requested_at: row.requested_at,
    requested_by_name: (row as { staff?: { name?: string } | null }).staff?.name ?? null,
  }));
}

export async function listEditRequestLog(limit = 50) {
  await requireDistributor();
  const { data, error } = await supabaseAdmin
    .from("edit_requests")
    .select("id, table_name, entry_id, status, requested_at, resolved_at, staff:requested_by(name)")
    .order("requested_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the edit request log.");
  return (data ?? []).map((row) => ({
    id: row.id,
    table_name: row.table_name,
    entry_id: row.entry_id,
    status: row.status,
    requested_at: row.requested_at,
    resolved_at: row.resolved_at,
    requested_by_name: (row as { staff?: { name?: string } | null }).staff?.name ?? null,
  }));
}

/** Ids in a register that have at least one logged edit — used for the "Edited" badge. */
export async function listEditedEntryIds(tableName: string) {
  await requireSignedIn();
  assertTable(tableName);
  const { data, error } = await supabaseAdmin
    .from("entry_edit_history")
    .select("entry_id")
    .eq("table_name", tableName)
    .limit(2000);
  if (error) throw new Error("Could not load edit history.");
  return Array.from(new Set((data ?? []).map((r) => r.entry_id)));
}

export async function listEntryEditHistory(tableName: string, entryId: string) {
  await requireSignedIn();
  assertTable(tableName);
  const { data, error } = await supabaseAdmin
    .from("entry_edit_history")
    .select("id, field_name, old_value, new_value, edited_at, staff:edited_by(name)")
    .eq("table_name", tableName)
    .eq("entry_id", entryId)
    .order("edited_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load edit history.");
  return (data ?? []).map((row) => ({
    id: row.id,
    field_name: row.field_name,
    old_value: row.old_value,
    new_value: row.new_value,
    edited_at: row.edited_at,
    edited_by_name: (row as { staff?: { name?: string } | null }).staff?.name ?? null,
  }));
}
