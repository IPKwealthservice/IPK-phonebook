export function formatPhone(input?: string | null): string {
  if (!input) return "No phone";
  const digits = String(input).replace(/\D+/g, "");
  if (digits.length < 7) return input;
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Fallback for longer international formats: group with spaces
  return digits.replace(/(.{3})/g, "$1 ").trim();
}

// Converts enum-like labels (e.g., ACCOUNT_OPENED) into human-readable
// form (e.g., "Account Opened"). If the value already contains spaces,
// it is returned with each word capitalized for visual consistency.
export function humanizeEnum(value: string): string {
  if (!value) return value;
  const normalized = value.replace(/[_-]+/g, " ");
  return normalized
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
