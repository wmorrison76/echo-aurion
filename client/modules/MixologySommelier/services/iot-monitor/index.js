import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import alertsRouter from "./alerts.controller.ts";
import {
  attachCoolerSensor,
  initializeSensorHandler,
} from "./sensor.service.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    service: "LUCCCA IoT Monitor (EchoCooler Module)",
    version: "1.0.0",
    status: "active",
  });
});

app.use("/alerts", alertsRouter);

// Initialize MQTT message handler
initializeSensorHandler();

// Example: Attach initial sensors (from env or config)
const initialSensors = process.env.INITIAL_SENSORS;
if (initialSensors) {
  try {
    const sensors = JSON.parse(initialSensors);
    sensors.forEach((sensor) => {
      attachCoolerSensor(
        sensor.sensorId,
        sensor.venueId,
        sensor.wineId || null,
      );
    });
    console.log(`✅ Attached ${sensors.length} initial sensors`);
  } catch (error) {
    console.error("Error parsing INITIAL_SENSORS:", error);
  }
}

const PORT = process.env.IOT_PORT || process.env.PORT || 8140;
app.listen(PORT, () => {
  console.log(`🧊 IoT Monitor Service running on port ${PORT}`);
  console.log(`   GET /alerts/:venueId — get active alerts`);
  console.log(`   GET /alerts/:venueId/avg — temperature averages`);
  console.log(`   GET /alerts/:venueId/readings — recent sensor readings`);
  console.log(`   PATCH /alerts/:alertId/resolve — resolve alert`);
  console.log(`   POST /alerts/sensor/attach — attach new sensor`);
});
