import type { RequestHandler } from "express";
import { generateFlashReport } from "../../shared/adapters";
import type { OperaCharge } from "../../shared/adapters/opera";
import type { ToastCheck } from "../../shared/adapters/toast";
const SAMPLE_OPERA: OperaCharge[] = [
  {
    reservationId: "R-88310",
    propertyId: "LUCCCA-PACIFIC",
    folioNumber: "F-1001",
    postedAt: "2024-11-05",
    amount: 425,
    currency: "USD",
    category: "room",
    description: "Deluxe King nightly rate",
  },
  {
    reservationId: "R-88310",
    propertyId: "LUCCCA-PACIFIC",
    folioNumber: "F-1001",
    postedAt: "2024-11-05",
    amount: 35,
    currency: "USD",
    category: "tax",
    description: "Occupancy tax",
  },
  {
    reservationId: "R-88310",
    propertyId: "LUCCCA-PACIFIC",
    folioNumber: "F-1001",
    postedAt: "2024-11-05",
    amount: 20,
    currency: "USD",
    category: "allowance",
    description: "Loyalty stay credit",
  },
];
const SAMPLE_TOAST: ToastCheck[] = [
  {
    checkId: "CHK-5510",
    locationId: "LUCCCA-PACIFIC-FNB",
    openedAt: "2024-11-05T18:10:00Z",
    closedAt: "2024-11-05T19:05:00Z",
    currency: "USD",
    server: "Jordan",
    items: [
      {
        menuItemId: "M-100",
        name: "Seared scallops",
        category: "food",
        gross: 42,
        net: 42,
        tax: 3.36,
        cost: 18,
      },
      {
        menuItemId: "M-201",
        name: "Sparkling wine",
        category: "beverage",
        gross: 28,
        net: 28,
        tax: 2.24,
        cost: 9,
      },
      {
        menuItemId: "M-900",
        name: "Service charge",
        category: "service",
        gross: 12,
        net: 12,
        tax: 0,
      },
    ],
  },
];
export const handleFlashReport: RequestHandler = (req, res) => {
  const ledgerId = (req.body?.ledgerId as string) ?? "ledger-luccca";
  const operaCharges =
    (req.body?.operaCharges as OperaCharge[] | undefined) ?? SAMPLE_OPERA;
  const toastChecks =
    (req.body?.toastChecks as ToastCheck[] | undefined) ?? SAMPLE_TOAST;
  const report = generateFlashReport({ ledgerId, operaCharges, toastChecks });
  res.json({
    ledgerId: report.ledgerId,
    totals: report.totals,
    integrity: report.integrity,
    opera: report.opera,
    toast: report.toast,
    events: report.events,
  });
};
