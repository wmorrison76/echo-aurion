import mqtt from "mqtt";
import dotenv from "dotenv";
dotenv.config();

const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

export const mqttClient = mqtt.connect(brokerUrl, {
  reconnectPeriod: 1000,
  connectTimeout: 10000,
});

mqttClient.on("connect", () => {
  console.log(`🔌 Connected to MQTT broker: ${brokerUrl}`);
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
});

mqttClient.on("offline", () => {
  console.log("⚠️  MQTT client offline");
});

mqttClient.on("reconnect", () => {
  console.log("🔄 Attempting to reconnect to MQTT broker...");
});
