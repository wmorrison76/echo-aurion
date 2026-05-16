import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getPairings } from "../services/api";
import PairingModal from "../components/PairingModal";

export default function Pairing() {
  const [dish, setDish] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!dish.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await getPairings(dish);
      setResults(data);
    } catch (error) {
      console.error("Error fetching pairings:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Find the Perfect Wine Pairing</Text>
      <Text style={styles.subtitle}>
        Enter a dish name to get AI-powered pairing recommendations
      </Text>

      <TextInput
        placeholder="e.g., Grilled Salmon, Ribeye Steak..."
        value={dish}
        onChangeText={setDish}
        style={styles.input}
        placeholderTextColor="#999"
        editable={!loading}
      />

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? "Searching..." : "Find Pairings"}
          onPress={handleSearch}
          color="#8B0000"
          disabled={loading}
        />
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#8B0000" style={styles.loader} />
      )}

      {searched && !loading && results.length === 0 && (
        <Text style={styles.noResults}>
          No pairings found. Try another dish.
        </Text>
      )}

      {results.map((result) => (
        <PairingModal key={result.wine_id} pairing={result} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  buttonContainer: {
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  noResults: {
    textAlign: "center",
    marginVertical: 20,
    fontSize: 14,
    color: "#999",
  },
});
