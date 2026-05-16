# LUCCCA IoT Monitor (EchoCooler Module)

**Purpose:** Real-time cellar health monitoring via MQTT-connected sensors. Track temperature, humidity, and vibration for wine preservation and compliance.

## Features

- **MQTT Integration** — Connect temperature/humidity sensors
- **Temperature Monitoring** — Per-venue thresholds with auto-alerts
- **Historical Analytics** — 7-day temperature trends
- **Alert Management** — Create, list, and resolve alerts
- **Dynamic Sensor Binding** — Attach sensors to specific wine lots
- **REST API** — Full CRUD for monitoring and alerts

## Tech Stack

- **Express.js** — REST API
- **MQTT** — Sensor data ingestion
- **PostgreSQL** — Time-series data storage
- **Luxon** — Date/time handling

## Setup

### Prerequisites

- Node.js 18+
- MQTT Broker (Mosquitto, HiveMQ, Azure IoT Hub, etc.)
- PostgreSQL

### Installation

1. Create `.env` file:

   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/sommelier_db
   MQTT_BROKER_URL=mqtt://localhost:1883
   IOT_PORT=8140
   INITIAL_SENSORS=[{"sensorId":"sensor-001","venueId":"venue-uuid"}]
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start service:
   ```bash
   npm run dev
   ```

Service will run on `http://localhost:8140`

### MQTT Sensor Configuration

Sensors should publish temperature readings to:

```
luccca/cooler/{sensorId}/temp
```

**Payload format:** Plain number (e.g., `12.5`)

**Example (using MQTT client):**

```bash
mosquitto_pub -h localhost -t "luccca/cooler/sensor-001/temp" -m "12.3"
```

## API Endpoints

### GET /alerts/:venueId

Get alerts for a venue.

**Query Parameters:**

- `resolved` — Filter by status (`false` for unresolved, `true` for all; default: false)

**Response:**

```json
{
  "status": "ok",
  "venueId": "uuid",
  "count": 2,
  "data": [
    {
      "id": "uuid",
      "venue_id": "uuid",
      "sensor_id": "sensor-001",
      "message": "Temperature out of range: 22.5°C (threshold: 8-18°C)",
      "created_at": "2024-01-31T14:22:00Z",
      "resolved": false
    }
  ]
}
```

### GET /alerts/:venueId/avg

Get temperature statistics for a venue.

**Query Parameters:**

- `days` — Number of days to analyze (default: 7)

**Response:**

```json
{
  "status": "ok",
  "data": {
    "venueId": "uuid",
    "days": 7,
    "summary": {
      "avgTemp": 12.3,
      "maxTemp": 18.2,
      "minTemp": 8.1
    },
    "readings": [
      {
        "date": "2024-01-31",
        "avg": 12.3,
        "max": 18.2,
        "min": 8.1,
        "count": 1440
      }
    ]
  }
}
```

### GET /alerts/:venueId/readings

Get recent sensor readings for a venue.

**Query Parameters:**

- `limit` — Number of readings (default: 100)

**Response:**

```json
{
  "status": "ok",
  "venueId": "uuid",
  "count": 50,
  "data": [
    {
      "sensorId": "sensor-001",
      "temp": 12.5,
      "wineId": "wine-uuid",
      "timestamp": "2024-01-31T14:22:00Z"
    }
  ]
}
```

### PATCH /alerts/:alertId/resolve

Mark an alert as resolved.

**Response:**

```json
{
  "status": "resolved",
  "alert_id": "uuid"
}
```

### POST /alerts/sensor/attach

Attach a new sensor to monitoring.

**Body:**

```json
{
  "sensorId": "sensor-002",
  "venueId": "venue-uuid",
  "wineId": "wine-uuid (optional)"
}
```

## Database Schema

### sensor_logs

```sql
CREATE TABLE sensor_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id TEXT,
  venue_id UUID,
  wine_id UUID,
  temp_c NUMERIC(5,2),
  humidity_pct NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT now()
);
```

### alerts

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID,
  sensor_id TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  resolved BOOLEAN DEFAULT FALSE
);
```

### venues (extended)

```sql
ALTER TABLE venues ADD COLUMN IF NOT EXISTS min_temp NUMERIC DEFAULT 8;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS max_temp NUMERIC DEFAULT 18;
```

## Temperature Thresholds

**Recommended Wine Storage:**

- **Red wines:** 12-15°C
- **White wines:** 10-12°C
- **Rosé & Sparkling:** 8-10°C
- **General safe range:** 8-18°C

Adjust per venue in the `venues` table.

## MQTT Integration Examples

### Publish from IoT Device (Python)

```python
import paho.mqtt.client as mqtt

client = mqtt.Client()
client.connect("your-mqtt-broker", 1883, 60)

# Publish temperature reading every 60 seconds
import time
while True:
    temp = read_temp_sensor()
    client.publish("luccca/cooler/sensor-001/temp", str(temp))
    time.sleep(60)
```

### Publish from Arduino

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient wifi;
PubSubClient client(wifi);

void setup() {
  client.setServer("mqtt-broker-ip", 1883);
}

void loop() {
  float temp = readTemperature();
  client.publish("luccca/cooler/sensor-001/temp", String(temp).c_str());
  delay(60000);
}
```

## Monitoring & Alerting

### Alert Types

1. **Temperature Out of Range** — Automatic when temp exceeds venue min/max
2. **Sensor Offline** — Future: detect missing readings for >2 hours
3. **Rapid Temperature Change** — Future: anomaly detection

### Next Steps

- **Humidity Monitoring** — Add humidity sensors to detect condensation
- **Vibration Detection** — Detect bottle movement/theft
- **Mobile Notifications** — Send push alerts via Firebase Cloud Messaging
- **Historical Analytics** — Identify seasonal temperature patterns
- **AR Integration** — Visualize cooler health in augmented reality

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `MQTT_BROKER_URL` — MQTT broker URL (default: mqtt://localhost:1883)
- `IOT_PORT` — Service port (default: 8140)
- `INITIAL_SENSORS` — JSON array of sensors to auto-attach (optional)

## Troubleshooting

### MQTT Connection Failed

- Check broker is running: `mosquitto -v`
- Verify MQTT_BROKER_URL in .env
- Test connection: `mosquitto_sub -h localhost -t "#"`

### No Temperature Readings

- Verify sensor is publishing to correct topic: `luccca/cooler/{sensorId}/temp`
- Check database connection: `psql $DATABASE_URL`
- View logs: Enable debug in mqtt.client.js

### Alerts Not Creating

- Ensure `venues` table has `min_temp` and `max_temp` columns
- Verify venue ID exists
- Check database for existing alerts: `SELECT * FROM alerts;`

## Next Steps

- Section 6: Multi-Venue Sync Hub
- Section 8: Master Sommelier Education
- Section 9: EchoVinum Archive
