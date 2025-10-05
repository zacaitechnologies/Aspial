// Utility function to calculate grand total
export function calculateGrandTotal(totalPrice: number, duration: number): number {
  return totalPrice * duration;
}

// Utility function to calculate monthly price from grand total
export function calculateMonthlyPrice(grandTotal: number, duration: number): number {
  return duration > 0 ? grandTotal / duration : grandTotal;
}
