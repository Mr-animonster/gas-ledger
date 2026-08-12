import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAppSession } from "./agency.server";
import { computedAmount, DEFAULT_RATES, type SaleItem } from "./sales-math";

const BUCKET = "booklet-pages";

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.authed) throw new Error("Not signed in");
  if (session.data.role !== "computer_staff" && session.data.role !== "distributor") {
    throw new Error("This register is limited to computer staff and the distributor.");
  }
  return session;
}

export async function getStandardRates(): Promise<Record<SaleItem, number>> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key, value")
    .in("key", ["standard_rate_refill", "standard_rate_arb_other"]);
  const map = new Map((data ?? []).map((r) => [r.key, Number(r.value)]));
  const refill = map.get("standard_rate_refill");
  const arb = map.get("standard_rate_arb_other");
  return {
    Refill: Number.isFinite(refill) ? (refill as number) : DEFAULT_RATES.Refill,
    "ARB-Other": Number.isFinite(arb) ? (arb as number) : DEFAULT_RATES["ARB-Other"],
  };
}

async function signPhoto(path: string | null) {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 8);
  return data?.signedUrl ?? null;
}

export async function getSalesDay(date: string) {
  await requireSession();

  const [{ data: batches, error }, rates] = await Promise.all([
    supabaseAdmin
      .from("sales_batches")
      .select("*")
      .eq("batch_date", date)
      .order("created_at", { ascending: true }),
    getStandardRates(),
  ]);
  if (error) throw new Error("Could not load the sales register for this date.");

  const ids = (batches ?? []).map((b) => b.id);
  let entries: Array<Record<string, unknown>> = [];
  if (ids.length > 0) {
    const { data, error: entriesError } = await supabaseAdmin
      .from("sales_entries")
      .select("*")
      .in("batch_id", ids)
      .order("cash_memo_no", { ascending: true });
    if (entriesError) throw new Error("Could not load the cash memos for this date.");
    entries = data ?? [];
  }

  const withPhotos = await Promise.all(
    (batches ?? []).map(async (batch) => ({
      ...batch,
      photo_url: await signPhoto(batch.booklet_page_photo_ref),
      entries: entries
        .filter((e) => e["batch_id"] === batch.id)
        .map((e) => ({
          id: String(e["id"]),
          cash_memo_no: Number(e["cash_memo_no"]),
          consumer_id: (e["consumer_id"] as string | null) ?? null,
          consumer_no: (e["consumer_no"] as string | null) ?? null,
          consumer_name: (e["consumer_name"] as string | null) ?? null,
          package_code_id: (e["package_code_id"] as string | null) ?? null,
          item: e["item"] as SaleItem,
          quantity: Number(e["quantity"]),
          rate: Number(e["rate"]),
          amount_charged: Number(e["amount_charged"]),
          payment_mode: e["payment_mode"] as "Cash" | "UPI" | "Card",
          pdc_done: Boolean(e["pdc_done"]),
        })),
    })),
  );

  return {
    date,
    batches: withPhotos,
    standardRates: rates,
    dayLocked: withPhotos.length > 0 && withPhotos.every((b) => b.locked),
  };
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Unsupported photo format.");
  const contentType = match[1]!;
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { contentType, bytes };
}

export type SalesRowInput = {
  id: string | null;
  consumer_id: string | null;
  consumer_no: string | null;
  consumer_name: string | null;
  package_code_id: string | null;
  item: SaleItem;
  quantity: number;
  rate: number;
  amount_charged: number;
  payment_mode: "Cash" | "UPI" | "Card";
  pdc_done: boolean;
};

export async function saveSalesBatch(input: {
  batchId: string | null;
  date: string;
  issued_by: string | null;
  rows: SalesRowInput[];
  photoDataUrl: string | null;
  lock: boolean;
}) {
  await requireSession();

  if (input.batchId) {
    const { data: existing } = await supabaseAdmin
      .from("sales_batches")
      .select("locked")
      .eq("id", input.batchId)
      .maybeSingle();
    if (existing?.locked) throw new Error("This batch is locked. Request an edit to make changes.");
  }

  let batchId = input.batchId;
  if (!batchId) {
    const { data, error } = await supabaseAdmin
      .from("sales_batches")
      .insert({ batch_date: input.date, issued_by: input.issued_by })
      .select("id")
      .single();
    if (error || !data) throw new Error("Could not create the batch.");
    batchId = data.id;
  }

  let photoPath: string | null = null;
  if (input.photoDataUrl) {
    const { contentType, bytes } = decodeDataUrl(input.photoDataUrl);
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    photoPath = `${input.date}/${batchId}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(photoPath, bytes, { contentType, upsert: true });
    if (error) throw new Error("Could not upload the booklet page photo.");
  }

  // Rows removed in the grid are deleted; cash memo numbers are never reused.
  const keepIds = input.rows.map((r) => r.id).filter((id): id is string => Boolean(id));
  const deleteQuery = supabaseAdmin.from("sales_entries").delete().eq("batch_id", batchId);
  const { error: deleteError } = keepIds.length
    ? await deleteQuery.not("id", "in", `(${keepIds.join(",")})`)
    : await deleteQuery;
  if (deleteError) throw new Error("Could not update the batch rows.");

  const base = (row: SalesRowInput) => ({
    batch_id: batchId!,
    sale_date: input.date,
    consumer_id: row.consumer_id,
    consumer_no: row.consumer_no,
    consumer_name: row.consumer_name,
    package_code_id: row.package_code_id,
    item: row.item,
    quantity: Math.max(0, Math.round(row.quantity) || 0),
    rate: Number(row.rate) || 0,
    amount_charged: Number.isFinite(row.amount_charged)
      ? Number(row.amount_charged)
      : computedAmount(row),
    payment_mode: row.payment_mode,
    pdc_done: row.pdc_done,
    issued_by: input.issued_by,
  });

  const inserts = input.rows.filter((r) => !r.id).map(base);
  if (inserts.length > 0) {
    // cash_memo_no is left to the database sequence — never typed, never reused.
    const { error } = await supabaseAdmin.from("sales_entries").insert(inserts);
    if (error) throw new Error("Could not save the new cash memos.");
  }

  for (const row of input.rows.filter((r) => r.id)) {
    const { error } = await supabaseAdmin.from("sales_entries").update(base(row)).eq("id", row.id!);
    if (error) throw new Error("Could not update an existing cash memo.");
  }

  const batchUpdate = {
    issued_by: input.issued_by,
    ...(photoPath ? { booklet_page_photo_ref: photoPath } : {}),
    ...(input.lock ? { locked: true, locked_at: new Date().toISOString() } : {}),
  };
  const { error: batchError } = await supabaseAdmin
    .from("sales_batches")
    .update(batchUpdate)
    .eq("id", batchId);
  if (batchError) throw new Error("Could not finalise the batch.");

  return { batchId, day: await getSalesDay(input.date) };
}

export async function lockSalesDay(date: string) {
  const session = await requireSession();
  if (session.data.role !== "distributor" && session.data.role !== "computer_staff") {
    throw new Error("Not allowed.");
  }
  const { error } = await supabaseAdmin
    .from("sales_batches")
    .update({ locked: true, locked_at: new Date().toISOString() })
    .eq("batch_date", date)
    .eq("locked", false);
  if (error) throw new Error("Could not lock the day.");
  return getSalesDay(date);
}
