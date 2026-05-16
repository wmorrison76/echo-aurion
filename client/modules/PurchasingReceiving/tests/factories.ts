import { faker } from "@faker-js/faker";
export interface Organization {
  id: string;
  name: string;
  tier: "startup" | "growth" | "enterprise";
  outlets: number;
  createdAt: Date;
  features: string[];
}
export interface Outlet {
  id: string;
  orgId: string;
  name: string;
  type: "restaurant" | "casino" | "resort" | "bar" | "hotel";
  location: {
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  };
  seats: number;
  covers: number;
  status: "active" | "inactive";
  createdAt: Date;
}
export interface User {
  id: string;
  orgId: string;
  outletId?: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "receiver" | "chef" | "finance";
  active: boolean;
  createdAt: Date;
}
export interface Product {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  category: string;
  vendor?: string;
  cost: number;
  unit: string;
  active: boolean;
}
export interface Inventory {
  id: string;
  outletId: string;
  productId: string;
  onHand: number;
  par: number;
  min: number;
  max: number;
  lastCounted: Date;
}
export interface PurchaseOrder {
  id: string;
  outletId: string;
  vendorId: string;
  status: "draft" | "sent" | "acked" | "partial" | "complete" | "canceled";
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  total: number;
  createdAt: Date;
  dueDate?: Date;
}
export interface Invoice {
  id: string;
  outletId: string;
  vendorId: string;
  invoiceNumber: string;
  date: Date;
  dueDate?: Date;
  total: number;
  status: "pending" | "approved" | "paid" | "disputed";
  items: Array<{
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}
class TestDataFactory {
  createOrganization(overrides?: Partial<Organization>): Organization {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      tier: faker.helpers.arrayElement(["startup", "growth", "enterprise"]),
      outlets: faker.number.int({ min: 1, max: 50 }),
      createdAt: faker.date.past(),
      features: [
        "analytics",
        "invoices",
        "inventory",
        "purchasing",
        "receiving",
      ],
      ...overrides,
    };
  }
  createOutlet(orgId: string, overrides?: Partial<Outlet>): Outlet {
    const outletTypes: Array<Outlet["type"]> = [
      "restaurant",
      "casino",
      "resort",
      "bar",
      "hotel",
    ];
    return {
      id: faker.string.uuid(),
      orgId,
      name: faker.company.name(),
      type: faker.helpers.arrayElement(outletTypes),
      location: {
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zip: faker.location.zipCode(),
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude()),
      },
      seats: faker.number.int({ min: 20, max: 500 }),
      covers: faker.number.int({ min: 100, max: 2000 }),
      status: "active",
      createdAt: faker.date.past(),
      ...overrides,
    };
  }
  createUser(
    orgId: string,
    outletId?: string,
    overrides?: Partial<User>,
  ): User {
    const roles: User["role"][] = [
      "admin",
      "manager",
      "receiver",
      "chef",
      "finance",
    ];
    return {
      id: faker.string.uuid(),
      orgId,
      outletId,
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: faker.helpers.arrayElement(roles),
      active: true,
      createdAt: faker.date.past(),
      ...overrides,
    };
  }
  createProduct(orgId: string, overrides?: Partial<Product>): Product {
    const categories = [
      "Protein",
      "Produce",
      "Dairy",
      "Dry Goods",
      "Seafood",
      "Beverage",
      "Bakery",
      "Frozen",
    ];
    const units = ["each", "lb", "oz", "case", "l", "ml"];
    return {
      id: faker.string.uuid(),
      orgId,
      sku: faker.string.alphaNumeric(8).toUpperCase(),
      name: faker.commerce.productName(),
      category: faker.helpers.arrayElement(categories),
      vendor: faker.company.name(),
      cost: parseFloat(faker.commerce.price({ min: 1, max: 500 })),
      unit: faker.helpers.arrayElement(units),
      active: true,
      ...overrides,
    };
  }
  createInventory(
    outletId: string,
    productId: string,
    overrides?: Partial<Inventory>,
  ): Inventory {
    const onHand = faker.number.int({ min: 0, max: 200 });
    const par = faker.number.int({ min: 10, max: 100 });
    return {
      id: faker.string.uuid(),
      outletId,
      productId,
      onHand,
      par,
      min: Math.floor(par * 0.5),
      max: Math.floor(par * 1.5),
      lastCounted: faker.date.recent(),
      ...overrides,
    };
  }
  createPurchaseOrder(
    outletId: string,
    vendorId: string,
    items?: Array<{ productId: string; quantity: number; unitPrice: number }>,
    overrides?: Partial<PurchaseOrder>,
  ): PurchaseOrder {
    const defaultItems = items || [
      {
        productId: faker.string.uuid(),
        quantity: faker.number.int({ min: 1, max: 100 }),
        unitPrice: parseFloat(faker.commerce.price({ min: 1, max: 100 })),
      },
    ];
    const total = defaultItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    return {
      id: faker.string.uuid(),
      outletId,
      vendorId,
      status: faker.helpers.arrayElement([
        "draft",
        "sent",
        "acked",
        "complete",
      ]),
      items: defaultItems,
      total,
      createdAt: faker.date.recent(),
      dueDate: faker.date.future(),
      ...overrides,
    };
  }
  createInvoice(
    outletId: string,
    vendorId: string,
    overrides?: Partial<Invoice>,
  ): Invoice {
    const items = Array.from({
      length: faker.number.int({ min: 1, max: 10 }),
    }).map(() => {
      const quantity = faker.number.int({ min: 1, max: 50 });
      const unitPrice = parseFloat(faker.commerce.price({ min: 1, max: 100 }));
      return {
        sku: faker.string.alphaNumeric(8).toUpperCase(),
        description: faker.commerce.productName(),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });
    const total = items.reduce((sum, item) => sum + item.total, 0);
    return {
      id: faker.string.uuid(),
      outletId,
      vendorId,
      invoiceNumber: faker.string.alphaNumeric(10).toUpperCase(),
      date: faker.date.recent(),
      dueDate: faker.date.future(),
      total,
      status: faker.helpers.arrayElement([
        "pending",
        "approved",
        "paid",
        "disputed",
      ]),
      items,
      ...overrides,
    };
  }
  createMultiOutletOrganization(outletCount = 5): {
    org: Organization;
    outlets: Outlet[];
    users: User[];
  } {
    const org = this.createOrganization({ outlets: outletCount });
    const outlets = Array.from({ length: outletCount }).map(() =>
      this.createOutlet(org.id),
    );
    const users = [
      this.createUser(org.id, undefined, { role: "admin" }),
      ...outlets.flatMap((outlet) => [
        this.createUser(org.id, outlet.id, { role: "manager" }),
        this.createUser(org.id, outlet.id, { role: "receiver" }),
        this.createUser(org.id, outlet.id, { role: "chef" }),
      ]),
    ];
    return { org, outlets, users };
  }
}
export const testFactory = new TestDataFactory();
