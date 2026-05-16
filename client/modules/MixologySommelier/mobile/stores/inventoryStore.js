/**
 * Inventory Store (Zustand)
 * Manages inventory state for mobile app
 */

import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const useInventoryStore = create(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      lastSync: null,
      pendingUpdates: [],

      // Load inventory from server
      loadInventory: async (venueId) => {
        set({ loading: true });
        try {
          const response = await axios.get(`${API_BASE_URL}/liquor-inventory`, {
            params: { venueId },
          });
          const items = response.data || [];
          set({ items, loading: false, lastSync: new Date().toISOString() });
          return items;
        } catch (error) {
          console.error('Failed to load inventory:', error);
          // Try to load from local storage
          const localItems = await AsyncStorage.getItem(`inventory_${venueId}`);
          if (localItems) {
            set({ items: JSON.parse(localItems), loading: false });
          } else {
            set({ loading: false });
          }
          return [];
        }
      },

      // Update inventory item
      updateItem: async (itemId, updates) => {
        const { items } = get();
        const updatedItems = items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        );
        set({ items: updatedItems });

        // Add to pending updates
        const { pendingUpdates } = get();
        set({
          pendingUpdates: [
            ...pendingUpdates,
            {
              itemId,
              updates,
              timestamp: new Date().toISOString(),
            },
          ],
        });

        // Save locally
        await AsyncStorage.setItem('inventory', JSON.stringify(updatedItems));
      },

      // Add new item
      addItem: (item) => {
        const { items } = get();
        set({ items: [...items, item] });
      },

      // Sync with server
      syncWithServer: async (venueId) => {
        const { pendingUpdates, items } = get();
        
        if (pendingUpdates.length === 0) {
          return { synced: 0, failed: 0 };
        }

        try {
          // Send all pending updates
          const results = await Promise.allSettled(
            pendingUpdates.map((update) =>
              axios.patch(
                `${API_BASE_URL}/liquor-inventory/${update.itemId}`,
                update.updates
              )
            )
          );

          const synced = results.filter((r) => r.status === 'fulfilled').length;
          const failed = results.filter((r) => r.status === 'rejected').length;

          // Clear pending updates
          set({ pendingUpdates: [], lastSync: new Date().toISOString() });

          // Refresh inventory
          await get().loadInventory(venueId);

          return { synced, failed };
        } catch (error) {
          console.error('Sync failed:', error);
          return { synced: 0, failed: pendingUpdates.length };
        }
      },

      // Get item by ID
      getItem: (itemId) => {
        const { items } = get();
        return items.find((item) => item.id === itemId);
      },

      // Search items
      searchItems: (query) => {
        const { items } = get();
        const lowerQuery = query.toLowerCase();
        return items.filter(
          (item) =>
            item.name.toLowerCase().includes(lowerQuery) ||
            item.spirit_type?.toLowerCase().includes(lowerQuery) ||
            item.producer?.toLowerCase().includes(lowerQuery) ||
            item.sku?.toLowerCase().includes(lowerQuery)
        );
      },

      // Get low stock items
      getLowStockItems: () => {
        const { items } = get();
        return items.filter(
          (item) =>
            item.volumePercent <= item.reorder_point ||
            item.total_qty <= item.reorder_point
        );
      },
    }),
    {
      name: 'inventory-storage',
      getStorage: () => AsyncStorage,
    }
  )
);

export { useInventoryStore };
