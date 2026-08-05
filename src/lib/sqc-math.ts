export type SqcLineInput = {
  tare_weight: number;
  gross_weight: number;
  observed_weight: number;
};

/** Variation (kg) = observed weight − expected net (gross − tare). */
export function computeVariation(line: SqcLineInput): number {
  const expectedNet = (Number(line.gross_weight) || 0) - (Number(line.tare_weight) || 0);
  const variation = (Number(line.observed_weight) || 0) - expectedNet;
  return Math.round(variation * 1000) / 1000;
}

/** Number of cylinders that must be sampled: 10% of the consignment, rounded up. */
export function requiredSampleCount(totalCylinders: number): number {
  const total = Math.max(0, Math.floor(Number(totalCylinders) || 0));
  return Math.ceil(total * 0.1);
}

/** Within the configurable tolerance, expressed in grams (default ±10 g). */
export function withinTolerance(variationKg: number, toleranceGrams: number): boolean {
  return Math.abs(variationKg * 1000) <= toleranceGrams + 1e-6;
}
