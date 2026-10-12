/**
 * Formats a number to Iraqi Dinar (IQD) display strictly in Iraqi Dinar.
 * Always formats as integer with thousands separators:
 * E.g., 1000 -> "1,000 د.ع"
 *       5000 -> "5,000 د.ع"
 *       25000 -> "25,000 د.ع"
 * No currency conversion or fractional distortion.
 */
export function formatIQD(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 د.ع';
  }
  const numericVal = Math.round(Number(amount));
  return `${numericVal.toLocaleString('en-US')} د.ع`;
}

/**
 * Tabular formatting for data dashboards (identical to formatIQD for consistency)
 */
export function formatIQDTabular(amount: number): string {
  return formatIQD(amount);
}
