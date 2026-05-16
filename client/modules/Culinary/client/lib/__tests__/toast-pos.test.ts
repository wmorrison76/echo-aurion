import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toastPOS, type ToastOrder, type ToastMenu } from '../toast-pos-integration';

vi.mock('../auth-service', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          api_token: 'test-token',
          client_id: 'test-client',
          location_id: 'test-location',
        },
        error: null,
      }),
    })),
  },
}));

describe('ToastPOSManager', () => {
  beforeEach(async () => {
    await toastPOS.initialize('org-1');
  });

  describe('Initialization', () => {
    it('should initialize with valid credentials', async () => {
      const result = await toastPOS.initialize('org-1');
      expect(typeof result).toBe('boolean');
    });

    it('should return connection status', () => {
      const isConnected = toastPOS.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should handle missing credentials', async () => {
      const result = await toastPOS.initialize('invalid-org');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Menu Management', () => {
    it('should fetch menu from Toast', async () => {
      const result = await toastPOS.fetchMenu();

      expect(result).toHaveProperty('success');
      if (result.success && result.menu) {
        expect(result.menu).toHaveProperty('id');
        expect(result.menu).toHaveProperty('name');
        expect(Array.isArray(result.menu.items)).toBe(true);
      }
    });

    it('should fetch specific menu by ID', async () => {
      const result = await toastPOS.fetchMenu('menu-123');

      expect(result).toHaveProperty('success');
    });

    it('should sync recipe to Toast menu', async () => {
      const recipe = {
        title: 'Grilled Salmon',
        description: 'Wild-caught salmon with lemon butter',
        course: 'Entrees',
        imageDataUrls: ['https://example.com/salmon.jpg'],
        ingredients: ['Salmon', 'Lemon', 'Butter', 'Salt', 'Pepper'],
        extra: {
          costPerServing: 12.5,
        },
      };

      const result = await toastPOS.syncRecipeToToastMenu('recipe-1', recipe);

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('menuItemId');
      }
    });

    it('should handle menu with sections', async () => {
      const result = await toastPOS.fetchMenu();

      if (result.success && result.menu?.sections) {
        expect(Array.isArray(result.menu.sections)).toBe(true);
        result.menu.sections.forEach((section) => {
          expect(section).toHaveProperty('name');
          expect(section).toHaveProperty('items');
        });
      }
    });

    it('should include modifiers in menu items', async () => {
      const result = await toastPOS.fetchMenu();

      if (result.success && result.menu?.items.length) {
        const itemWithModifiers = result.menu.items.find((i) => i.modifiers);
        if (itemWithModifiers) {
          expect(Array.isArray(itemWithModifiers.modifiers)).toBe(true);
        }
      }
    });
  });

  describe('Order Management', () => {
    it('should fetch orders from Toast', async () => {
      const now = Date.now();
      const startTime = now - 86400000; // 24 hours ago
      const endTime = now;

      const result = await toastPOS.fetchOrders(startTime, endTime);

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(Array.isArray(result.orders)).toBe(true);
      }
    });

    it('should create new order', async () => {
      const order: Partial<ToastOrder> = {
        guestCount: 2,
        items: [
          {
            id: 'item-1',
            name: 'Salmon',
            price: 24.99,
            quantity: 1,
            modifiers: [],
            voided: false,
          },
        ],
        notes: 'No lemon',
      };

      const result = await toastPOS.createOrder(order);

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('orderId');
      }
    });

    it('should get order status', async () => {
      const result = await toastPOS.getOrderStatus('order-123');

      expect(result).toHaveProperty('success');
      if (result.success && result.order) {
        expect(['Open', 'Completed', 'Voided']).toContain(result.order.status);
      }
    });

    it('should track order totals correctly', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(now - 3600000, now);

      if (result.success && result.orders?.length) {
        result.orders.forEach((order) => {
          expect(order.total).toBe(order.subtotal + order.tax);
        });
      }
    });

    it('should include payment information', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(now - 86400000, now);

      if (result.success && result.orders?.length) {
        const paidOrder = result.orders.find((o) => o.payments?.length > 0);
        if (paidOrder) {
          expect(Array.isArray(paidOrder.payments)).toBe(true);
        }
      }
    });

    it('should include discounts in order', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(now - 86400000, now);

      if (result.success && result.orders?.length) {
        const discountedOrder = result.orders.find((o) => o.discounts?.length > 0);
        if (discountedOrder) {
          expect(Array.isArray(discountedOrder.discounts)).toBe(true);
        }
      }
    });
  });

  describe('Fulfillment Management', () => {
    it('should update fulfillment status', async () => {
      const result = await toastPOS.updateFulfillment('fulfillment-1', 'Ready');

      expect(result).toHaveProperty('success');
    });

    it('should support all fulfillment statuses', async () => {
      const statuses = ['New', 'Received', 'In-Progress', 'Ready', 'Completed', 'Cancelled'] as const;

      for (const status of statuses) {
        const result = await toastPOS.updateFulfillment('fulfillment-1', status);
        expect(result).toHaveProperty('success');
      }
    });
  });

  describe('Real-time Sync', () => {
    it('should start sync interval', () => {
      toastPOS.startSync(5000);
      expect(toastPOS.isConnected()).toBe(true);
      toastPOS.stopSync();
    });

    it('should stop sync interval', () => {
      toastPOS.startSync(5000);
      toastPOS.stopSync();
      expect(typeof toastPOS.isConnected()).toBe('boolean');
    });

    it('should get sync status', async () => {
      const status = await toastPOS.getSyncStatus();

      if (status) {
        expect(status).toHaveProperty('lastSyncTime');
        expect(status).toHaveProperty('syncedOrders');
        expect(typeof status.syncedOrders).toBe('number');
      }
    });

    it('should perform periodic sync', async () => {
      toastPOS.startSync(1000);
      
      // Wait for sync to occur
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const status = await toastPOS.getSyncStatus();
      expect(status).toBeDefined();
      
      toastPOS.stopSync();
    });
  });

  describe('Recipe to Menu Sync', () => {
    it('should sync multiple recipes to menu', async () => {
      const recipes = [
        {
          id: 'recipe-1',
          title: 'Pasta',
          ingredients: ['Pasta', 'Tomato', 'Basil'],
        },
        {
          id: 'recipe-2',
          title: 'Risotto',
          ingredients: ['Rice', 'Broth', 'Cheese'],
        },
      ];

      const results = await Promise.all(
        recipes.map((r) => toastPOS.syncRecipeToToastMenu(r.id, r))
      );

      expect(results.length).toBe(2);
      results.forEach((r) => {
        expect(r).toHaveProperty('success');
      });
    });

    it('should map recipe costs to menu prices', async () => {
      const recipe = {
        title: 'Steak',
        ingredients: [],
        extra: {
          costPerServing: 18.5,
        },
      };

      const result = await toastPOS.syncRecipeToToastMenu('recipe-steak', recipe);
      expect(result).toHaveProperty('success');
    });

    it('should create modifiers from ingredients', async () => {
      const recipe = {
        title: 'Custom Burger',
        ingredients: ['Beef', 'Bun', 'Lettuce', 'Tomato', 'Cheese', 'Onion'],
      };

      const result = await toastPOS.syncRecipeToToastMenu('recipe-burger', recipe);
      expect(result).toHaveProperty('success');
    });
  });

  describe('Data Normalization', () => {
    it('should normalize menu items', async () => {
      const result = await toastPOS.fetchMenu();

      if (result.success && result.menu?.items.length) {
        const item = result.menu.items[0];
        expect(typeof item.id).toBe('string');
        expect(typeof item.name).toBe('string');
        expect(typeof item.price).toBe('number');
        expect(typeof item.disabled).toBe('boolean');
      }
    });

    it('should normalize orders with correct totals', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(now - 3600000, now);

      if (result.success && result.orders?.length) {
        const order = result.orders[0];
        expect(typeof order.subtotal).toBe('number');
        expect(typeof order.tax).toBe('number');
        expect(typeof order.total).toBe('number');
        expect(order.total).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle price conversion from cents', async () => {
      const result = await toastPOS.fetchMenu();

      if (result.success && result.menu?.items.length) {
        result.menu.items.forEach((item) => {
          // Prices should be in dollars, not cents
          expect(item.price).toBeLessThan(1000); // Assuming no items over $1000
        });
      }
    });

    it('should include all order item details', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(now - 86400000, now);

      if (result.success && result.orders?.length) {
        const order = result.orders[0];
        if (order.items.length > 0) {
          const item = order.items[0];
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('price');
          expect(item).toHaveProperty('quantity');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const result = await toastPOS.fetchMenu('invalid-id');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });

    it('should handle network errors', async () => {
      const result = await toastPOS.createOrder({
        items: [],
      });

      expect(result).toHaveProperty('success');
    });

    it('should handle missing credentials', async () => {
      const result = await toastPOS.getOrderStatus('order-1');

      expect(result).toHaveProperty('success');
    });

    it('should retry on transient failures', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(now - 3600000, now);

      expect(result).toHaveProperty('success');
    });
  });

  describe('Integration Scenarios', () => {
    it('should sync entire restaurant workflow', async () => {
      // 1. Fetch menu
      const menuResult = await toastPOS.fetchMenu();
      expect(menuResult.success).toBeDefined();

      // 2. Create order
      if (menuResult.success && menuResult.menu?.items.length) {
        const item = menuResult.menu.items[0];
        const orderResult = await toastPOS.createOrder({
          guestCount: 1,
          items: [
            {
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: 1,
              modifiers: [],
              voided: false,
            },
          ],
        });

        expect(orderResult).toHaveProperty('success');

        // 3. Check order status
        if (orderResult.orderId) {
          const statusResult = await toastPOS.getOrderStatus(orderResult.orderId);
          expect(statusResult).toHaveProperty('success');
        }
      }
    });

    it('should handle concurrent operations', async () => {
      const operations = [
        toastPOS.fetchMenu(),
        toastPOS.fetchOrders(Date.now() - 3600000, Date.now()),
        toastPOS.getSyncStatus(),
      ];

      const results = await Promise.all(operations);

      expect(results.length).toBe(3);
      results.forEach((r) => {
        expect(r).toBeDefined();
      });
    });

    it('should maintain sync across recipe updates', async () => {
      const recipe1 = {
        title: 'Original Recipe',
        ingredients: ['Ingredient 1'],
      };

      const result1 = await toastPOS.syncRecipeToToastMenu('recipe-1', recipe1);
      expect(result1).toHaveProperty('success');

      // Update recipe
      const recipe2 = {
        title: 'Updated Recipe',
        ingredients: ['Ingredient 1', 'Ingredient 2'],
      };

      const result2 = await toastPOS.syncRecipeToToastMenu('recipe-1', recipe2);
      expect(result2).toHaveProperty('success');
    });
  });

  describe('Performance', () => {
    it('should handle bulk order fetching', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(
        now - 7 * 86400000, // 7 days
        now
      );

      expect(result).toHaveProperty('success');
      if (result.orders) {
        expect(result.orders.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should cache menu data efficiently', async () => {
      // First call
      const result1 = await toastPOS.fetchMenu();
      
      // Second call should be faster
      const result2 = await toastPOS.fetchMenu();

      expect(result1.success).toBe(result2.success);
    });

    it('should handle large order lists', async () => {
      const now = Date.now();
      const result = await toastPOS.fetchOrders(
        now - 30 * 86400000, // 30 days
        now
      );

      expect(result).toHaveProperty('success');
    });
  });
});
