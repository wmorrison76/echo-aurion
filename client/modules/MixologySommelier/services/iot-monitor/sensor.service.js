import db from "./db-client.js";
import { mqttClient } from "./mqtt-client.js";
import { DateTime } from "luxon";

const activeSensors = new Map();

/**
 * Subscribe to a cooler/sensor topic and log telemetry
 * @param {string} sensorId - Unique sensor ID
 * @param {string} venueId - UUID of venue
 * @param {string} wineId - UUID of wine (optional)
 */
export function attachCoolerSensor(sensorId, venueId, wineId = null) {
  const topic = `luccca/cooler/${sensorId}/temp`;

  if (activeSensors.has(sensorId)) {
    console.log(`Sensor ${sensorId} already attached`);
    return;
  }

  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error(`Error subscribing to ${topic}:`, err);
    } else {
      console.log(`📡 Subscribed to sensor topic: ${topic}`);
      activeSensors.set(sensorId, { venueId, wineId, topic });
    }
  });

  // Handle incoming messages for all subscriptions
  // (This will be set up once in index.js)
}

/**
 * Initialize message handler for MQTT client
 */
export function initializeSensorHandler() {
  mqttClient.on("message", async (topic, payload) => {
    try {
      // Parse topic: luccca/cooler/{sensorId}/temp
      const parts = topic.split("/");
      if (parts.length < 4 || parts[1] !== "cooler") return;

      const sensorId = parts[2];
      const sensorData = activeSensors.get(sensorId);
      if (!sensorData) return;

      const temp = parseFloat(payload.toString());
      const ts = DateTime.now().toISO();
      const { venueId, wineId } = sensorData;

      // Store sensor reading
      await db.query(
        `INSERT INTO sensor_logs (sensor_id, venue_id, wine_id, temp_c, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [sensorId, venueId, wineId || null, temp, ts],
      );

      // Evaluate temperature thresholds
      await evaluateTemperatureThreshold(sensorId, venueId, temp);
    } catch (error) {
      console.error("Error processing sensor message:", error);
    }
  });
}

/**
 * Evaluate temperature against venue thresholds and raise alerts
 * @param {string} sensorId - Sensor ID
 * @param {string} venueId - Venue ID
 * @param {number} temp - Current temperature in Celsius
 */
async function evaluateTemperatureThreshold(sensorId, venueId, temp) {
  try {
    const result = await db.query(
      "SELECT min_temp, max_temp FROM venues WHERE id = $1",
      [venueId],
    );

    if (!result.rows || result.rows.length === 0) {
      // Use defaults if venue not found
      const minTemp = 8;
      const maxTemp = 18;
      if (temp < minTemp || temp > maxTemp) {
        await createAlert(
          venueId,
          sensorId,
          `Temperature out of range: ${temp}°C (threshold: ${minTemp}-${maxTemp}°C)`,
        );
      }
      return;
    }

    const { min_temp, max_temp } = result.rows[0];

    if (temp < min_temp || temp > max_temp) {
      await createAlert(
        venueId,
        sensorId,
        `Temperature out of range: ${temp}°C (threshold: ${min_temp}-${max_temp}°C)`,
      );
      console.warn(
        `⚠️  Temperature alert for ${venueId}/${sensorId}: ${temp}°C`,
      );
    }
  } catch (error) {
    console.error("Error evaluating temperature threshold:", error);
  }
}

/**
 * Create a new alert in the database
 * @param {string} venueId - Venue ID
 * @param {string} sensorId - Sensor ID
 * @param {string} message - Alert message
 */
async function createAlert(venueId, sensorId, message) {
  try {
    await db.query(
      `INSERT INTO alerts (venue_id, sensor_id, message, created_at, resolved)
       VALUES ($1, $2, $3, NOW(), FALSE)`,
      [venueId, sensorId, message],
    );
  } catch (error) {
    console.error("Error creating alert:", error);
  }
}

/**
 * Get historical temperature averages for a venue
 * @param {string} venueId - Venue ID
 * @param {number} days - Number of days to analyze
 * @returns {object} temperature statistics
 */
export async function getTemperatureAverages(venueId, days = 7) {
  try {
    const result = await db.query(
      `SELECT 
        AVG(temp_c) AS avg_temp,
        MAX(temp_c) AS max_temp,
        MIN(temp_c) AS min_temp,
        COUNT(*) AS reading_count,
        DATE(created_at) AS date
       FROM sensor_logs
       WHERE venue_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [venueId],
    );

    return {
      venueId,
      days,
      summary: {
        avgTemp: result.rows[0]?.avg_temp
          ? parseFloat(result.rows[0].avg_temp.toFixed(2))
          : null,
        maxTemp: result.rows[0]?.max_temp
          ? parseFloat(result.rows[0].max_temp.toFixed(2))
          : null,
        minTemp: result.rows[0]?.min_temp
          ? parseFloat(result.rows[0].min_temp.toFixed(2))
          : null,
      },
      readings: (result.rows || []).map((row) => ({
        date: row.date,
        avg: parseFloat(row.avg_temp || 0),
        max: parseFloat(row.max_temp || 0),
        min: parseFloat(row.min_temp || 0),
        count: parseInt(row.reading_count || 0),
      })),
    };
  } catch (error) {
    console.error("Error getting temperature averages:", error);
    throw error;
  }
}

/**
 * Get active alerts for a venue
 * @param {string} venueId - Venue ID
 * @param {boolean} unresolved - Only get unresolved alerts
 * @returns {array} alerts
 */
export async function getAlerts(venueId, unresolved = true) {
  try {
    const query = unresolved
      ? `SELECT * FROM alerts WHERE venue_id = $1 AND resolved = FALSE ORDER BY created_at DESC LIMIT 50`
      : `SELECT * FROM alerts WHERE venue_id = $1 ORDER BY created_at DESC LIMIT 50`;

    const result = await db.query(query, [venueId]);
    return result.rows || [];
  } catch (error) {
    console.error("Error getting alerts:", error);
    return [];
  }
}

/**
 * Resolve an alert
 * @param {string} alertId - Alert ID
 * @returns {object} result
 */
export async function resolveAlert(alertId) {
  try {
    await db.query("UPDATE alerts SET resolved = TRUE WHERE id = $1", [
      alertId,
    ]);
    return { status: "resolved", alert_id: alertId };
  } catch (error) {
    console.error("Error resolving alert:", error);
    throw error;
  }
}

/**
 * Get recent sensor readings for a venue
 * @param {string} venueId - Venue ID
 * @param {number} limit - Number of readings to return
 * @returns {array} sensor readings
 */
export async function getRecentReadings(venueId, limit = 100) {
  try {
    const result = await db.query(
      `SELECT sensor_id, temp_c, wine_id, created_at
       FROM sensor_logs
       WHERE venue_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [venueId, limit],
    );

    return (result.rows || []).map((row) => ({
      sensorId: row.sensor_id,
      temp: parseFloat(row.temp_c),
      wineId: row.wine_id,
      timestamp: row.created_at,
    }));
  } catch (error) {
    console.error("Error getting recent readings:", error);
    return [];
  }
}
