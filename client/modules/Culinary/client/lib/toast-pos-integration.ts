import { supabase } from "./auth-service";

export interface ToastMenu {
  id: string;
  name: string;
  description?: string;
  items: ToastMenuItem[];
  sections: ToastMenuSection[];
  lastUpdated: number;
}

export interface ToastMenuItem {
  id: string;
  externalId?: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  category: string;
  tags: string[];
  disabled: boolean;
  sod?: "Start of Day" | "All Day";
  modifiers?: ToastModifier[];
  allergens?: string[];
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
}

export interface ToastModifier {
  id: string;
  name: string;
  type: "Choice" | "SplitChoice" | "Quantity";
  required: boolean;
  options: ToastModifierOption[];
}

export interface ToastModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ToastMenuSection {
  id: string;
  name: string;
  items: string[]; // Array of item IDs
  ordinal: number;
}

export interface ToastOrder {
  id: string;
  externalId?: string;
  checkId?: string;
  guestCount: number;
  items: ToastOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Open" | "Completed" | "Voided";
  createdAt: number;
  closedAt?: number;
  serviceCharge?: number;
  discounts: Array<{
    name: string;
    amount: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
    timestamp: number;
  }>;
  notes?: string;
}

export interface ToastOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: Array<{
    name: string;
    price: number;
  }>;
  voided: boolean;
}

export interface ToastFulfillment {
  id: string;
  orderId: string;
  type: "Dine-In" | "Takeout" | "Delivery";
  status:
    | "New"
    | "Received"
    | "In-Progress"
    | "Ready"
    | "Completed"
    | "Cancelled";
  readyTime?: number;
  completedTime?: number;
}

export interface ToastSync {
  organizationId: string;
  lastSyncTime: number;
  syncedMenus: number;
  syncedOrders: number;
  syncErrors: string[];
}

class ToastPOSManager {
  private organizationId: string = "";
  private apiToken: string = "";
  private clientId: string = "";
  private locationId: string = "";
  private syncInterval: NodeJS.Timer | null = null;
  private readonly API_BASE = "https://api.toasttab.com/v1";

  /**
   * Initialize Toast POS connection
   */
  async initialize(organizationId: string): Promise<boolean> {
    this.organizationId = organizationId;

    try {
      const { data, error } = await supabase
        .from("toast_credentials")
        .select("api_token, client_id, location_id")
        .eq("organization_id", organizationId)
        .single();

      if (error || !data) {
        console.error("Toast credentials not found");
        return false;
      }

      this.apiToken = data.api_token;
      this.clientId = data.client_id;
      this.locationId = data.location_id;

      return true;
    } catch (error) {
      console.error("Error initializing Toast POS:", error);
      return false;
    }
  }

  /**
   * Fetch menu from Toast
   */
  async fetchMenu(
    menuId?: string,
  ): Promise<{ success: boolean; menu?: ToastMenu; error?: any }> {
    if (!this.apiToken) {
      return { success: false, error: "Toast not initialized" };
    }

    try {
      const endpoint = menuId
        ? `${this.API_BASE}/menus/${menuId}`
        : `${this.API_BASE}/locations/${this.locationId}/menus`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.statusText}` };
      }

      const data = await response.json();
      const menu = this.normalizeMenu(data);

      return { success: true, menu };
    } catch (error) {
      console.error("Error fetching menu from Toast:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Sync recipe to Toast menu item
   */
  async syncRecipeToToastMenu(
    recipeId: string,
    recipe: any,
  ): Promise<{ success: boolean; menuItemId?: string; error?: any }> {
    if (!this.apiToken) {
      return { success: false, error: "Toast not initialized" };
    }

    try {
      const menuItem = {
        name: recipe.title,
        description: recipe.description || "",
        price: (recipe.extra?.costPerServing || 0) * 100, // Toast uses cents
        category: recipe.course || "Entrees",
        imageUrl: recipe.imageDataUrls?.[0],
        modifiers: this.buildModifiersFromIngredients(recipe.ingredients || []),
        externalId: recipeId,
      };

      const response = await fetch(
        `${this.API_BASE}/locations/${this.locationId}/menus/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(menuItem),
        },
      );

      if (!response.ok) {
        return { success: false, error: `API error: ${response.statusText}` };
      }

      const data = await response.json();

      // Store Toast menu item ID mapping
      await supabase.from("recipe_toast_mapping").upsert({
        recipe_id: recipeId,
        organization_id: this.organizationId,
        toast_item_id: data.id,
        last_synced: new Date().toISOString(),
      });

      return { success: true, menuItemId: data.id };
    } catch (error) {
      console.error("Error syncing recipe to Toast:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Fetch orders from Toast
   */
  async fetchOrders(
    startTime: number,
    endTime: number,
  ): Promise<{ success: boolean; orders?: ToastOrder[]; error?: any }> {
    if (!this.apiToken) {
      return { success: false, error: "Toast not initialized" };
    }

    try {
      const params = new URLSearchParams({
        locationId: this.locationId,
        startDate: new Date(startTime).toISOString(),
        endDate: new Date(endTime).toISOString(),
      });

      const response = await fetch(`${this.API_BASE}/orders?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.statusText}` };
      }

      const data = await response.json();
      const orders = (data.orders || []).map((o: any) =>
        this.normalizeOrder(o),
      );

      return { success: true, orders };
    } catch (error) {
      console.error("Error fetching orders from Toast:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Create order in Toast
   */
  async createOrder(
    order: Partial<ToastOrder>,
  ): Promise<{ success: boolean; orderId?: string; error?: any }> {
    if (!this.apiToken) {
      return { success: false, error: "Toast not initialized" };
    }

    try {
      const toastOrder = {
        locationId: this.locationId,
        guestCount: order.guestCount || 1,
        items:
          order.items?.map((item) => ({
            itemId: item.id,
            quantity: item.quantity,
            modifiers: item.modifiers,
          })) || [],
        notes: order.notes,
      };

      const response = await fetch(`${this.API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toastOrder),
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.statusText}` };
      }

      const data = await response.json();

      return { success: true, orderId: data.id };
    } catch (error) {
      console.error("Error creating order in Toast:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(
    orderId: string,
  ): Promise<{ success: boolean; order?: ToastOrder; error?: any }> {
    if (!this.apiToken) {
      return { success: false, error: "Toast not initialized" };
    }

    try {
      const response = await fetch(`${this.API_BASE}/orders/${orderId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.statusText}` };
      }

      const data = await response.json();
      const order = this.normalizeOrder(data);

      return { success: true, order };
    } catch (error) {
      console.error("Error fetching order status:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update fulfillment status
   */
  async updateFulfillment(
    fulfillmentId: string,
    status: ToastFulfillment["status"],
  ): Promise<{ success: boolean; error?: any }> {
    if (!this.apiToken) {
      return { success: false, error: "Toast not initialized" };
    }

    try {
      const response = await fetch(
        `${this.API_BASE}/fulfillments/${fulfillmentId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        return { success: false, error: `API error: ${response.statusText}` };
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating fulfillment:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Start real-time sync
   */
  startSync(intervalMs: number = 60000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval as ReturnType<typeof setInterval>);
    }

    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, intervalMs);

    // Perform initial sync
    this.performSync();
  }

  /**
   * Stop real-time sync
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval as ReturnType<typeof setInterval>);
      this.syncInterval = null;
    }
  }

  /**
   * Perform data sync
   */
  private async performSync(): Promise<void> {
    if (!this.apiToken) return;

    const syncStart = Date.now() - 3600000; // Last hour
    const syncEnd = Date.now();

    try {
      // Fetch and store orders
      const ordersResult = await this.fetchOrders(syncStart, syncEnd);
      if (ordersResult.success && ordersResult.orders) {
        await this.storeOrders(ordersResult.orders);
      }

      // Update sync status
      await supabase.from("toast_sync_status").upsert({
        organization_id: this.organizationId,
        last_sync_time: new Date().toISOString(),
        synced_orders: ordersResult.orders?.length || 0,
        status: "success",
      });
    } catch (error) {
      console.error("Sync error:", error);
      await supabase.from("toast_sync_status").upsert({
        organization_id: this.organizationId,
        last_sync_time: new Date().toISOString(),
        status: "error",
        error: String(error),
      });
    }
  }

  /**
   * Store orders in database
   */
  private async storeOrders(orders: ToastOrder[]): Promise<void> {
    const { error } = await supabase.from("toast_orders").upsert(
      orders.map((o) => ({
        toast_order_id: o.id,
        organization_id: this.organizationId,
        order_data: o,
        status: o.status,
        created_at: new Date(o.createdAt).toISOString(),
      })),
    );

    if (error) {
      console.error("Error storing orders:", error);
    }
  }

  /**
   * Normalize Toast menu data
   */
  private normalizeMenu(data: any): ToastMenu {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      items: (data.items || []).map((item: any) =>
        this.normalizeMenuItem(item),
      ),
      sections: (data.sections || []).map((section: any) => ({
        id: section.id,
        name: section.name,
        items: section.items || [],
        ordinal: section.ordinal,
      })),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Normalize Toast menu item
   */
  private normalizeMenuItem(item: any): ToastMenuItem {
    return {
      id: item.id,
      externalId: item.externalId,
      name: item.name,
      description: item.description,
      price: (item.price || 0) / 100, // Convert from cents
      cost: item.cost ? item.cost / 100 : undefined,
      imageUrl: item.imageUrl,
      category: item.category,
      tags: item.tags || [],
      disabled: item.disabled || false,
      sod: item.sod,
      modifiers: (item.modifiers || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        required: m.required,
        options: m.options || [],
      })),
      allergens: item.allergens,
      nutritionInfo: item.nutritionInfo,
    };
  }

  /**
   * Normalize Toast order
   */
  private normalizeOrder(data: any): ToastOrder {
    return {
      id: data.id,
      externalId: data.externalId,
      checkId: data.checkId,
      guestCount: data.guestCount || 1,
      items: (data.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        price: (item.price || 0) / 100,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        voided: item.voided || false,
      })),
      subtotal: (data.subtotal || 0) / 100,
      tax: (data.tax || 0) / 100,
      total: (data.total || 0) / 100,
      status: data.status || "Open",
      createdAt: new Date(data.createdAt).getTime(),
      closedAt: data.closedAt ? new Date(data.closedAt).getTime() : undefined,
      serviceCharge: data.serviceCharge ? data.serviceCharge / 100 : undefined,
      discounts: data.discounts || [],
      payments: data.payments || [],
      notes: data.notes,
    };
  }

  /**
   * Build modifiers from recipe ingredients
   */
  private buildModifiersFromIngredients(
    ingredients: string[],
  ): ToastModifier[] {
    // Create optional ingredient modifiers
    return ingredients.slice(0, 5).map((ingredient, index) => ({
      id: `mod-${index}`,
      name: `${ingredient} Options`,
      type: "Choice" as const,
      required: false,
      options: [
        { id: "1", name: "Extra", price: 50 }, // 50 cents
        { id: "2", name: "Light", price: 0 },
        { id: "3", name: "None", price: -50 },
      ],
    }));
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<ToastSync | null> {
    try {
      const { data } = await supabase
        .from("toast_sync_status")
        .select("*")
        .eq("organization_id", this.organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!data) return null;

      return {
        organizationId: this.organizationId,
        lastSyncTime: new Date(data.last_sync_time).getTime(),
        syncedMenus: data.synced_menus || 0,
        syncedOrders: data.synced_orders || 0,
        syncErrors: data.errors || [],
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return null;
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return !!this.apiToken && !!this.locationId;
  }
}

export const toastPOS = new ToastPOSManager();
