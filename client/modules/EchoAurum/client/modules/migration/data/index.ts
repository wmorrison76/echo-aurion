import type { CompetitorExport } from "../../../../shared/migration";
export const exportsData: CompetitorExport[] = [
  {
    platform: "M3",
    files: [
      { name: "m3_gl.csv", type: "csv", sizeKb: 820, records: 4200 },
      { name: "m3_ap.csv", type: "csv", sizeKb: 640, records: 1800 },
    ],
    glCodes: ["5110", "5125"],
    apVendors: 240,
    payrollProfiles: 36,
    notes: "Includes LUCCCA AP vendor mappings and 5110/5125 cost centers",
  },
  {
    platform: "Intacct",
    files: [
      { name: "intacct_gl.csv", type: "csv", sizeKb: 760, records: 3200 },
      { name: "intacct_payroll.csv", type: "csv", sizeKb: 410, records: 950 },
    ],
    glCodes: ["5110", "5132"],
    apVendors: 180,
    payrollProfiles: 28,
    notes: "Segments include department + property codes",
  },
  {
    platform: "QuickBooks",
    files: [{ name: "qbo_gl.xlsx", type: "xlsx", sizeKb: 540, records: 2600 }],
    glCodes: ["5110", "5125", "5132"],
    apVendors: 120,
    payrollProfiles: 18,
  },
];
