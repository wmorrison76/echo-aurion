import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
} from "react-native";
import { getTrainingDeck } from "../services/api";

export default function Training() {
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const loadDeck = async () => {
      try {
        const data = await getTrainingDeck();
        setDeck(data);
      } catch (error) {
        console.error("Error loading training deck:", error);
        Alert.alert("Error", "Failed to load training deck");
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, []);

  const currentCard = deck[currentCardIndex];

  const handleNext = () => {
    if (currentCardIndex < deck.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setFlipped(false);
    } else {
      Alert.alert("Completed", "You've finished this training deck!");
      setCurrentCardIndex(0);
      setFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setFlipped(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  if (deck.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No training cards available</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Master Sommelier Training</Text>
      <Text style={styles.progress}>
        Card {currentCardIndex + 1} of {deck.length}
      </Text>

      <View style={styles.cardContainer}>
        <View
          style={[styles.card, flipped ? styles.cardFlipped : {}]}
          onTouchEnd={() => setFlipped(!flipped)}
        >
          <Text style={styles.cardLabel}>
            {flipped ? "Answer" : "Question"}
          </Text>
          <Text style={styles.cardContent}>
            {flipped ? currentCard.answer : currentCard.question}
          </Text>
          <Text style={styles.tapHint}>Tap to flip</Text>
        </View>
      </View>

      <View style={styles.navigationContainer}>
        <Button
          title="← Previous"
          onPress={handlePrevious}
          disabled={currentCardIndex === 0}
          color="#8B0000"
        />
        <Button title="Next →" onPress={handleNext} color="#8B0000" />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Progress: {Math.round(((currentCardIndex + 1) / deck.length) * 100)}%
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  progress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  cardContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  card: {
    width: "100%",
    minHeight: 300,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#8B0000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardFlipped: {
    backgroundColor: "#fff8f8",
  },
  cardLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
    fontWeight: "600",
  },
  cardContent: {
    fontSize: 18,
    color: "#1a1a1a",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 20,
  },
  tapHint: {
    fontSize: 12,
    color: "#8B0000",
    fontStyle: "italic",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  statsContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  statsText: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
