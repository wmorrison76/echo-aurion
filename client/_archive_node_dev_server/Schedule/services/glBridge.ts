/** * GL Bridge Service * Converts payroll, tips, and revenue data into accounting exports * Supports QuickBooks & Xero CSV formats */ import { getSupabase } from "../lib/supabase";
export interface GLEntry {
  account: string;
  department: string;
  debit: number;
  credit: number;
  tips?: number;
  description?: string;
} /** * Build GL export for organization * Returns CSV content as string */
export async function buildGLExport(
  org_id: string,
  format: "quickbooks" | "xero" = "quickbooks",
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not initialized"); // Fetch property summary data (aggregated by department) const { data: summaryData, error: summaryError } = await supabase .from("property_summary") .select("outlet_id, labor_cost, revenue, tips") .eq("org_id", org_id); if (summaryError) throw summaryError; // Fetch GL code mappings const { data: glCodes, error: glError } = await supabase .from("gl_codes") .select("dept_id, gl_code, category") .eq("org_id", org_id); if (glError) throw glError; // Build entries const entries: GLEntry[] = []; const codeMap = new Map( (glCodes || []).map((g: any) => [g.dept_id, g.gl_code]) ); // Group by outlet and calculate totals const summaryByOutlet = new Map<string, any>(); (summaryData || []).forEach((row: any) => { const key = row.outlet_id; const existing = summaryByOutlet.get(key) || { labor_cost: 0, revenue: 0, tips: 0, }; summaryByOutlet.set(key, { labor_cost: existing.labor_cost + (row.labor_cost || 0), revenue: existing.revenue + (row.revenue || 0), tips: existing.tips + (row.tips || 0), }); }); // Create GL entries summaryByOutlet.forEach((data, outlet_id) => { const glCode = codeMap.get(outlet_id) ||"5000"; entries.push({ account: glCode, department: outlet_id, debit: data.labor_cost, credit: data.revenue, tips: data.tips, description: `Labor and Revenue - ${outlet_id}`, }); }); // Format based on export type if (format ==="quickbooks") { return formatQuickbooksCSV(entries); } else if (format ==="xero") { return formatXeroCSV(entries); } return formatQuickbooksCSV(entries);
} /** * Format entries as QuickBooks CSV */
function formatQuickbooksCSV(entries: GLEntry[]): string {
  const lines = [
    "!ACCNT\tNAME\tACCNTTYPE\tDESC\tACCUM",
    "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tDOCNUM\tMEMO",
    "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tDOCNUM",
    "!ENDTRNS",
  ];
  entries.forEach((e, i) => {
    lines.push(
      `TRNS\t${i}\tCHECK\t${new Date().toISOString().slice(0, 10)}\t${e.account}\t${e.debit}\tGL001\t${e.description}`,
    );
    lines.push(
      `SPL\t${i}\tCHECK\t${new Date().toISOString().slice(0, 10)}\t${e.account}\t${e.credit}\tGL001`,
    );
    lines.push("ENDTRNS");
  });
  return lines.join("\n");
} /** * Format entries as Xero CSV */
function formatXeroCSV(entries: GLEntry[]): string {
  const lines = [
    "ContactName,EmailAddress,POAddressLine1,POAddressLine2,POAddressLine3,POAddressLine4,POCity,PORegion,POPostalCode,POCountry,InvoiceNumber,Reference,InvoiceDate,DueDate,InventoryItemCode,Description,Quantity,UnitAmount,Discount,AccountCode,TaxType,TaxAmount,TrackingName1,TrackingOption1,Currency",
  ];
  entries.forEach((e) => {
    lines.push(
      `,,,,,,,,,,,,${new Date().toISOString().slice(0, 10)},,1,"${e.description}",1,${e.debit},,${e.account},Tax on Purchases,0,,`,
    );
  });
  return lines.join("\n");
} /** * Export GL data to file */
export async function exportGLToFile(
  org_id: string,
  format: "quickbooks" | "xero",
  filepath: string,
): Promise<void> {
  const csv = await buildGLExport(org_id, format); // In production, write to file // fs.writeFileSync(filepath, csv); console.log(`GL Export (${format}) ready: ${csv.slice(0, 100)}...`);
}
