import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { getInventory } from "../services/api";
import InventoryList from "../components/InventoryList";

export default function Cellar() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadInventory = async () => {
    setRefreshing(true);
    try {
      const data = await getInventory();
      setInventory(data);
      setFilteredInventory(data);
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadInventory().then(() => setLoading(false));
  }, []);

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered = inventory.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(text.toLowerCase())) ||
        (item.region && item.region.toLowerCase().includes(text.toLowerCase())),
    );
    setFilteredInventory(filtered);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search by wine name or region..."
        value={searchText}
        onChangeText={handleSearch}
        placeholderTextColor="#999"
      />
      <Text style={styles.countText}>
        {filteredInventory.length} bottles in stock
      </Text>
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InventoryList item={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadInventory} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No wines found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#f8f8f8",
  },
  countText: {
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 12,
    color: "#666",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
