export type SaleItem = "Refill" | "ARB-Other";

export type SalesRowInputs = {
  quantity: number;
  rate: number;
  amount_charged: number;
};

export function computedAmount(row: { quantity: number; rate: number }) {
  const qty = Number(row.quantity) || 0;
  const rate = Number(row.rate) || 0;
  return Math.round(qty * rate * 100) / 100;
}

/** True when the typed amount deviates from quantity x rate (possible overcharge). */
export function isOverridden(row: SalesRowInputs) {
  return Math.abs(computedAmount(row) - (Number(row.amount_charged) || 0)) > 0.009;
}

export function batchTotal(rows: SalesRowInputs[]) {
  return Math.round(rows.reduce((sum, r) => sum + (Number(r.amount_charged) || 0), 0) * 100) / 100;
}

export const DEFAULT_RATES: Record<SaleItem, number> = {
  Refill: 1103.5,
  "ARB-Other": 250,
};
