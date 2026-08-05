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

export type StockClosing = {
  closing_good_filled: number;
  closing_good_empty: number;
  closing_defective_filled: number;
  closing_defective_empty: number;
};

/** Closing balances for the Daily Stock Register. */
export function computeClosing(row: StockInputs): StockClosing {
  return {
    closing_good_filled:
      row.opening_good_filled +
      row.received_from_plant -
      row.refill_sale -
      row.sv_new_issues -
      row.sv_additional_issues,
    closing_good_empty:
      row.opening_good_empty +
      row.received_from_consumer_refill +
      row.received_from_consumer_against_tv -
      row.returned_to_plant -
      row.newly_identified_defective,
    // Wired to the Defective Cylinder register later.
    closing_defective_filled: row.opening_defective_filled,
    // Net zero for now until the Defective register feeds this.
    closing_defective_empty:
      row.opening_defective_empty +
      row.defective_item_returned_to_plant -
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
