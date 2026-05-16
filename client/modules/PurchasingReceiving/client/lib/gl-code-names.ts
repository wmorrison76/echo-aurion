/** * Maps GL codes to their common accounting names * Used to display friendly names alongside GL codes */
export const GL_CODE_NAMES: Record<string, string> = {
  // COGS (Cost of Goods Sold)"6100":"COGS Food","6110":"COGS Beverages","6120":"COGS Supplies","6130":"COGS Paper","6140":"COGS Chemicals","6150":"COGS Other", // Payroll"7000":"Salaries & Wages","7100":"Payroll Taxes","7200":"Employee Benefits","7300":"Workers Comp", // Operating Expenses"7500":"Rent/Occupancy","7600":"Utilities","7700":"Maintenance","7800":"Supplies","7900":"Office Expense", // Depreciation & Other"8000":"Depreciation","8100":"Amortization","8200":"Interest Expense", // Revenue Accounts"4000":"Food Sales","4100":"Beverage Sales","4200":"Service Revenue", // Assets"1000":"Cash","1100":"Accounts Receivable","1200":"Inventory","1300":"Fixed Assets", // Liabilities"2000":"Accounts Payable","2100":"Accrued Expenses","2200":"Short-term Debt","2300":"Long-term Debt", // Equity"3000":"Owner's Equity","3100":"Retained Earnings",
}; /** * Get the display name for a GL code (code + common name) * @param glCode The GL code (e.g.,"6100") * @returns Formatted string like"6100 - COGS Food" or just"6100" if not found */
export function getGLCodeDisplay(glCode: string): string {
  if (!glCode) return "";
  const commonName = GL_CODE_NAMES[glCode];
  return commonName ? `${glCode} - ${commonName}` : glCode;
} /** * Get just the common name for a GL code * @param glCode The GL code (e.g.,"6100") * @returns The common name like"COGS Food" or empty string if not found */
export function getGLCodeName(glCode: string): string {
  return GL_CODE_NAMES[glCode] || "";
}
