/**
 * Format a number with thousand separators (commas) and fixed decimal places.
 * Example: 78000.5 -> "78,000.50"
 */
export function formatNumber(value: number, decimals = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0.00"
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
