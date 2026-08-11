export type StockInputs = {
  opening_good_filled: number;
  opening_good_empty: number;
  opening_defective_filled: number;
  opening_defective_empty: number;
  received_from_plant: number;
  refill_sale: number;
  sv_new_issues: number;
  sv_reconnection_issues: number;
  sv_additional_issues: number;
  received_from_consumer_refill: number;
  received_from_consumer_against_tv: number;
  returned_to_plant: number;
  defective_item_returned_to_plant: number;
  newly_identified_defective: number;
};

/** Fields the user still types in; everything else is auto-pulled from source registers. */
export const MANUAL_FIELDS = [
  "received_from_plant",
  "received_from_consumer_refill",
  "returned_to_plant",
] as const;
export type ManualField = (typeof MANUAL_FIELDS)[number];

/** Fields fed live by the Supabase daily views. */
export const AUTO_FIELDS = [
  "refill_sale",
  "sv_new_issues",
  "sv_reconnection_issues",
  "sv_additional_issues",
  "received_from_consumer_against_tv",
  "defective_item_returned_to_plant",
  "newly_identified_defective",
] as const;
export type AutoField = (typeof AUTO_FIELDS)[number];

/** TV retrievals split filled vs empty — not stored, only used for closing balances. */
export type TvSplit = { tv_filled: number; tv_empty: number };

export type StockClosing = {
  closing_good_filled: number;
  closing_good_empty: number;
  closing_defective_filled: number;
  closing_defective_empty: number;
};

/** Closing balances for the Daily Stock Register. */
export function computeClosing(row: StockInputs, tv?: Partial<TvSplit>): StockClosing {
  const tvFilled = tv?.tv_filled ?? 0;
  const tvEmpty = tv?.tv_empty ?? Math.max(0, row.received_from_consumer_against_tv - tvFilled);

  return {
    closing_good_filled:
      row.opening_good_filled +
      row.received_from_plant -
      row.refill_sale -
      row.sv_new_issues -
      row.sv_reconnection_issues -
      row.sv_additional_issues +
      tvFilled,
    closing_good_empty:
      row.opening_good_empty +
      row.received_from_consumer_refill +
      tvEmpty -
      row.returned_to_plant -
      row.newly_identified_defective,
    closing_defective_filled: row.opening_defective_filled,
    closing_defective_empty:
      row.opening_defective_empty +
      row.newly_identified_defective -
      row.defective_item_returned_to_plant,
  };
}

export const EMPTY_INPUTS: StockInputs = {
  opening_good_filled: 0,
  opening_good_empty: 0,
  opening_defective_filled: 0,
  opening_defective_empty: 0,
  received_from_plant: 0,
  refill_sale: 0,
  sv_new_issues: 0,
  sv_reconnection_issues: 0,
  sv_additional_issues: 0,
  received_from_consumer_refill: 0,
  received_from_consumer_against_tv: 0,
  returned_to_plant: 0,
  defective_item_returned_to_plant: 0,
  newly_identified_defective: 0,
};
