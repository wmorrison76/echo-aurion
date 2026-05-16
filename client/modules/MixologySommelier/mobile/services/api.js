import axios from "axios";

// Configure your backend API URL here
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const getStats = async () => {
  try {
    const response = await apiClient.get("/inventory/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      wines: 0,
      costPct: 0,
      topRegion: "Unknown",
      activeVenues: 0,
    };
  }
};

export const getInventory = async () => {
  try {
    const response = await apiClient.get("/inventory");
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
};

export const getPairings = async (dish) => {
  try {
    const response = await apiClient.get("/pairing", {
      params: { dish },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching pairings:", error);
    return [];
  }
};

export const getTrainingDeck = async () => {
  try {
    const response = await apiClient.get("/training");
    return response.data;
  } catch (error) {
    console.error("Error fetching training deck:", error);
    return [
      {
        question: "What is the primary characteristic of Burgundy Pinot Noir?",
        answer:
          "Light to medium body with high acidity and silky tannins, with red fruit and earthy notes.",
      },
      {
        question: "How do you match wine to food?",
        answer:
          "Consider acidity, body, tannins, and flavors. Match intensity levels and look for flavor bridges.",
      },
    ];
  }
};

export const submitFeedback = async (pairingId, feedback) => {
  try {
    const response = await apiClient.post("/pairing/feedback", {
      pairing_id: pairingId,
      feedback,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { status: "error" };
  }
};
