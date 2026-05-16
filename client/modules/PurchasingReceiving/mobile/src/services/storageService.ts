import AsyncStorage from "@react-native-async-storage/async-storage";
class StorageService {
  private prefix = "@echo_ops_mobile:";
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  }
  async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(this.getKey(key));
      return value ? JSON.parse(value) : defaultValue || null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return defaultValue || null;
    }
  }
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter((key) => key.startsWith(this.prefix));
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error("Error clearing storage:", error);
      throw error;
    }
  }
  async setMultiple(items: Record<string, any>): Promise<void> {
    try {
      const entries = Object.entries(items).map(([key, value]) => [
        this.getKey(key),
        JSON.stringify(value),
      ]);
      await AsyncStorage.multiSet(entries as any);
    } catch (error) {
      console.error("Error storing multiple items:", error);
      throw error;
    }
  }
  async getMultiple<T extends Record<string, any>>(keys: string[]): Promise<T> {
    try {
      const prefixedKeys = keys.map((key) => this.getKey(key));
      const values = await AsyncStorage.multiGet(prefixedKeys);
      const result: any = {};
      values.forEach(([key, value], index) => {
        const originalKey = keys[index];
        result[originalKey] = value ? JSON.parse(value) : null;
      });
      return result;
    } catch (error) {
      console.error("Error retrieving multiple items:", error);
      throw error;
    }
  }
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys
        .filter((key) => key.startsWith(this.prefix))
        .map((key) => key.replace(this.prefix, ""));
    } catch (error) {
      console.error("Error getting all keys:", error);
      return [];
    }
  }
}
export const storageService = new StorageService();
