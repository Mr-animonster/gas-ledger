/** Keep only the last 4 digits of a sensitive number (Aadhaar / bank a/c). */
export function last4(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}

/** Display form: XXXX XXXX 1234 style mask for a stored last-4 value. */
export function maskedDisplay(value: string | null | undefined, prefix = "XXXX XXXX "): string {
  if (!value) return "—";
  return `${prefix}${value}`;
}
