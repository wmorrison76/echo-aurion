// Toast POS integration for order management and payments

export type ToastLocation = {
  locationId: string;
  name: string;
  address: string;
  timezone: string;
};

export type ToastMenu = {
  entityId: string;
  name: string;
  description?: string;
  lastModified: number;
};

export type ToastMenuItem = {
  entityId: string;
  name: string;
  description?: string;
  price: number;
  pricingUnit: string;
  preparationTime: number; // minutes
  modifierGroups?: string[];
};

export type ToastOrder = {
  entityId: string;
  orderId: string;
  locationId: string;
  guid: string;
  externalId?: string;
  status: "open" | "closed" | "voided" | "submitted" | "ready";
  type: "dine-in" | "takeout" | "delivery" | "external-delivery";
  number?: string;
  notes?: string;
  createdDate: number;
  closedDate?: number;
  modifiedDate: number;
  estimated_ready_time?: number;
  discounts: ToastDiscount[];
  checks: ToastCheck[];
  payments: ToastPayment[];
  items: ToastOrderItem[];
};

export type ToastOrderItem = {
  entityId: string;
  guid: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  modifications?: ToastModification[];
  notes?: string;
  status: "open" | "prepared" | "served" | "voided";
};

export type ToastModification = {
  name: string;
  price: number;
  group: string;
};

export type ToastDiscount = {
  entityId: string;
  name: string;
  amount: number;
  percentage?: number;
  reason?: string;
};

export type ToastPayment = {
  entityId: string;
  type: "cash" | "card" | "gift_card" | "other";
  amount: number;
  cardType?: string;
  cardLast4?: string;
  timestamp: number;
  externalRef?: string;
};

export type ToastCheck = {
  entityId: string;
  number: number;
  total: number;
  subtotal: number;
  tax: number;
  items: ToastOrderItem[];
  payments: ToastPayment[];
  discounts: ToastDiscount[];
};

export type ToastCustomer = {
  entityId: string;
  externalId?: string;
  name: string;
  email?: string;
  phone?: string;
  addresses?: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
  }>;
  notes?: string;
  phone_number?: string;
  email_address?: string;
};

class ToastPOSIntegration {
  private apiUrl = "https://api.toasttab.com";
  private clientId = import.meta.env.VITE_TOAST_CLIENT_ID || "";
  private clientSecret = import.meta.env.VITE_TOAST_CLIENT_SECRET || "";
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Authenticate with Toast API
   */
  async authenticate(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return { success: true };
      }

      const response = await fetch(`${this.apiUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all locations
   */
  async getLocations(): Promise<ToastLocation[]> {
    await this.authenticate();

    try {
      const response = await fetch(`${this.apiUrl}/restaurants`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.restaurants || [];
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  }

  /**
   * Get menu items for location
   */
  async getMenuItems(locationId: string): Promise<ToastMenuItem[]> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/menus`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) return [];

      const data = await response.json();
      const items: ToastMenuItem[] = [];

      // Flatten menu structure
      for (const menu of data.menus || []) {
        for (const section of menu.sections || []) {
          for (const item of section.items || []) {
            items.push(item);
          }
        }
      }

      return items;
    } catch (error) {
      console.error("Error fetching menu items:", error);
      return [];
    }
  }

  /**
   * Get recent orders for location
   */
  async getOrders(locationId: string, limit: number = 50): Promise<ToastOrder[]> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/orders?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  }

  /**
   * Get specific order details
   */
  async getOrder(locationId: string, orderId: string): Promise<ToastOrder | null> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Error fetching order:", error);
      return null;
    }
  }

  /**
   * Create new order
   */
  async createOrder(
    locationId: string,
    orderData: {
      type: "dine-in" | "takeout" | "delivery";
      number?: string;
      items: Array<{
        menuItemId: string;
        quantity: number;
        modifications?: Array<{
          name: string;
          price: number;
        }>;
      }>;
      notes?: string;
      externalId?: string;
    },
  ): Promise<{
    success: boolean;
    order?: ToastOrder;
    error?: string;
  }> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/orders`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        },
      );

      if (!response.ok) {
        return { success: false, error: "Failed to create order" };
      }

      const order = await response.json();
      return { success: true, order };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update order
   */
  async updateOrder(
    locationId: string,
    orderId: string,
    updates: Partial<ToastOrder>,
  ): Promise<{
    success: boolean;
    order?: ToastOrder;
    error?: string;
  }> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/orders/${orderId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        return { success: false, error: "Failed to update order" };
      }

      const order = await response.json();
      return { success: true, order };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Add payment to order
   */
  async addPayment(
    locationId: string,
    orderId: string,
    payment: {
      type: "cash" | "card" | "gift_card";
      amount: number;
      cardType?: string;
      cardLast4?: string;
      externalRef?: string;
    },
  ): Promise<{
    success: boolean;
    payment?: ToastPayment;
    error?: string;
  }> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/orders/${orderId}/payments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payment,
            timestamp: Date.now(),
          }),
        },
      );

      if (!response.ok) {
        return { success: false, error: "Failed to add payment" };
      }

      const paymentData = await response.json();
      return { success: true, payment: paymentData };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get sales reports
   */
  async getSalesReport(
    locationId: string,
    startDate: number,
    endDate: number,
  ): Promise<{
    totalSales: number;
    totalOrders: number;
    averageCheck: number;
    itemsSold: Record<string, number>;
  } | null> {
    await this.authenticate();

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurants/${locationId}/reports/sales?start=${startDate}&end=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Error fetching sales report:", error);
      return null;
    }
  }

  /**
   * Subscribe to real-time order updates (webhook)
   */
  async setupWebhook(
    locationId: string,
    webhookUrl: string,
    events: string[] = ["order.created", "order.modified", "payment.added"],
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    await this.authenticate();

    try {
      const response = await fetch(`${this.apiUrl}/webhooks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId,
          url: webhookUrl,
          events,
          active: true,
        }),
      });

      return { success: response.ok };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Sync Toast order to local database
   */
  async syncOrderToDatabase(
    order: ToastOrder,
    organizationId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // This would be implemented with supabase in actual implementation
      console.log("Syncing Toast order to database:", {
        externalId: order.entityId,
        organizationId,
        totalAmount: order.checks[0]?.total || 0,
        items: order.items.length,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export const toastPOS = new ToastPOSIntegration();

/**
 * Map Toast menu item to recipe
 */
export function mapToastItemToRecipe(
  item: ToastMenuItem,
  recipeData: Record<string, any>,
): {
  toastId: string;
  recipeId?: string;
  name: string;
  matchConfidence: number;
} {
  const lowerName = item.name.toLowerCase();

  // Simple fuzzy matching
  let bestMatch: { recipeId?: string; confidence: number } = { confidence: 0 };

  for (const [id, recipe] of Object.entries(recipeData || {})) {
    const recipeName = (recipe as any).name?.toLowerCase() || "";
    const similarity = calculateStringSimilarity(lowerName, recipeName);

    if (similarity > bestMatch.confidence) {
      bestMatch = { recipeId: id, confidence: similarity };
    }
  }

  return {
    toastId: item.entityId,
    recipeId: bestMatch.recipeId,
    name: item.name,
    matchConfidence: bestMatch.confidence,
  };
}

/**
 * Calculate string similarity (Levenshtein-like)
 */
function calculateStringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate edit distance between strings
 */
function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}
