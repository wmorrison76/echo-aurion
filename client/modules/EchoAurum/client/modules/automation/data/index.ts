import type { TriadInput } from "../../../../shared/ap";
import type { OperaCharge } from "../../../../shared/adapters/opera";
import type { ToastCheck } from "../../../../shared/adapters/toast";
export const vendorTriads: TriadInput[] = [
  {
    invoice: {
      id: "INV-7412",
      vendor: "Sysco Coastal",
      purchaseOrderId: "PO-4521",
      invoiceDate: "2024-11-06",
      dueDate: "2024-11-21",
      currency: "USD",
      total: 18450,
      lines: [
        {
          sku: "SYS-110",
          description: "Produce replenishment",
          quantity: 150,
          unitCost: 78,
        },
        {
          sku: "SYS-302",
          description: "Prime protein",
          quantity: 60,
          unitCost: 122.5,
        },
      ],
    },
    purchaseOrder: {
      id: "PO-4521",
      vendor: "Sysco Coastal",
      currency: "USD",
      lines: [
        {
          sku: "SYS-110",
          description: "Produce replenishment",
          orderedQty: 150,
          unitCost: 78,
        },
        {
          sku: "SYS-302",
          description: "Prime protein",
          orderedQty: 60,
          unitCost: 122.5,
        },
      ],
    },
    receipts: [
      {
        id: "RCPT-5121",
        purchaseOrderId: "PO-4521",
        lines: [
          {
            sku: "SYS-110",
            receivedQty: 150,
            receivedAt: "2024-11-05T23:45:00Z",
          },
          {
            sku: "SYS-302",
            receivedQty: 60,
            receivedAt: "2024-11-05T23:45:00Z",
          },
        ],
      },
    ],
    ocr: [
      { field: "total", value: 18450, confidence: 0.95 },
      { field: "vendor", value: "Sysco Coastal", confidence: 0.92 },
      { field: "dueDate", value: "2024-11-21", confidence: 0.9 },
    ],
  },
  {
    invoice: {
      id: "INV-7550",
      vendor: "Harborline Laundry",
      purchaseOrderId: "PO-4670",
      invoiceDate: "2024-11-05",
      dueDate: "2024-11-20",
      currency: "USD",
      total: 6120,
      lines: [
        {
          sku: "HL-01",
          description: "Laundry rotation",
          quantity: 300,
          unitCost: 20.4,
        },
      ],
    },
    purchaseOrder: {
      id: "PO-4670",
      vendor: "Harborline Laundry",
      currency: "USD",
      lines: [
        {
          sku: "HL-01",
          description: "Laundry rotation",
          orderedQty: 300,
          unitCost: 20.4,
        },
      ],
    },
    receipts: [
      {
        id: "RCPT-5790",
        purchaseOrderId: "PO-4670",
        lines: [
          {
            sku: "HL-01",
            receivedQty: 280,
            receivedAt: "2024-11-05T21:10:00Z",
          },
        ],
      },
    ],
    ocr: [{ field: "total", value: 6120, confidence: 0.78 }],
  },
  {
    invoice: {
      id: "INV-7633",
      vendor: "Sundial Events",
      purchaseOrderId: "PO-4899",
      invoiceDate: "2024-11-04",
      dueDate: "2024-11-19",
      currency: "USD",
      total: 21480,
      lines: [
        {
          sku: "SE-AV",
          description: "Ballroom AV",
          quantity: 12,
          unitCost: 1790,
        },
      ],
    },
    purchaseOrder: {
      id: "PO-4899",
      vendor: "Sundial Events",
      currency: "USD",
      lines: [
        {
          sku: "SE-AV",
          description: "Ballroom AV",
          orderedQty: 8,
          unitCost: 1650,
        },
      ],
    },
    receipts: [
      {
        id: "RCPT-6022",
        purchaseOrderId: "PO-4899",
        lines: [
          { sku: "SE-AV", receivedQty: 6, receivedAt: "2024-11-04T18:35:00Z" },
        ],
      },
    ],
  },
];
export const operaCharges: OperaCharge[] = [
  {
    reservationId: "RSV-9001",
    propertyId: "Echo Towers",
    folioNumber: "FOL-8841",
    postedAt: "2024-11-06T06:30:00Z",
    amount: 4280,
    currency: "USD",
    category: "room",
    description: "Corporate block checkout",
  },
  {
    reservationId: "RSV-9055",
    propertyId: "Harborline",
    folioNumber: "FOL-8894",
    postedAt: "2024-11-06T07:10:00Z",
    amount: 1320,
    currency: "USD",
    category: "allowance",
    description: "Loyalty allowance",
  },
];
export const toastChecks: ToastCheck[] = [
  {
    checkId: "CHK-6112",
    locationId: "Echo Towers F&B",
    openedAt: "2024-11-06T16:05:00Z",
    closedAt: "2024-11-06T16:58:00Z",
    currency: "USD",
    server: "Andrea Khan",
    items: [
      {
        menuItemId: "MENU-FOOD-18",
        name: "Chef tasting menu",
        category: "food",
        gross: 96,
        net: 88,
        tax: 7.2,
        cost: 34,
      },
      {
        menuItemId: "MENU-BEV-02",
        name: "Reserve cabernet",
        category: "beverage",
        gross: 48,
        net: 42,
        tax: 3.4,
        cost: 19,
      },
      {
        menuItemId: "MENU-DISC-05",
        name: "VIP comp",
        category: "discount",
        gross: 0,
        net: -12,
        tax: 0,
      },
    ],
  },
  {
    checkId: "CHK-6130",
    locationId: "Harborline Lounge",
    openedAt: "2024-11-06T18:30:00Z",
    closedAt: "2024-11-06T19:22:00Z",
    currency: "USD",
    server: "Luis Ortega",
    items: [
      {
        menuItemId: "MENU-BEV-14",
        name: "Craft cocktail flight",
        category: "beverage",
        gross: 36,
        net: 32,
        tax: 2.8,
        cost: 11,
      },
      {
        menuItemId: "MENU-SERV-07",
        name: "Private tasting fee",
        category: "service",
        gross: 60,
        net: 60,
        tax: 0,
      },
    ],
  },
];
