# EchoServe Mobile

**Offline-first sommelier toolkit for field teams.** Real-time inventory management, AI-powered wine pairings, and Master Sommelier training on your phone or tablet.

## Features

- **Dashboard** — Overview of cellar stats, COGS %, top regions
- **Cellar Inventory** — Search and manage wine bottles across locations
- **AI Pairings** — Get wine recommendations for any dish (table-side)
- **Training Deck** — Interactive flashcards for sommelier education
- **Offline-First** — Local SQLite sync for unreliable connections
- **Auto-Sync** — Background syncing every 15 minutes (configurable)

## Tech Stack

- **React Native** + **Expo** — Cross-platform mobile
- **SQLite** — Local offline storage
- **AsyncStorage** — Key-value persistence
- **Axios** — Backend API communication
- **React Navigation** — Bottom tab navigation

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Mobile device or emulator (iOS/Android)

### Installation

1. Clone or extract this folder
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` file:

   ```
   EXPO_PUBLIC_API_URL=http://your-backend-api.com/api
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Scan QR code with Expo Go app (iOS/Android) or choose emulator option

### Development Build (Optional)

```bash
# For local testing without Expo Go
npx eas build --platform ios --local
npx eas build --platform android --local
```

## Folder Structure

```
mobile/
├── App.jsx                 # Navigation setup
├── screens/
│   ├── Dashboard.jsx       # Overview stats
│   ├── Cellar.jsx          # Inventory list
│   ├── Pairing.jsx         # AI pairing search
│   ├── Training.jsx        # Flashcard trainer
│   └── Settings.jsx        # Sync & app settings
├── components/
│   ├── StatTile.jsx        # Dashboard stat card
│   ├── InventoryList.jsx   # Wine item renderer
│   ├── PairingModal.jsx    # Pairing result card
│   └── StatTile.jsx        # KPI display
└── services/
    ├── api.js              # Backend API client
    ├── sync.js             # Data synchronization
    └── storage.js          # Local SQLite queries
```

## API Integration

The app connects to the LUCCCA backend at the following endpoints:

- `GET /api/inventory` — Fetch all wines
- `GET /api/inventory/stats` — Dashboard KPIs
- `GET /api/pairing` — Compute wine pairings
- `GET /api/training` — Training deck flashcards

### Environment Variables

Set in `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

## Offline Architecture

### Local Storage (SQLite)

- **inventory** — Wine bottles and par levels
- **saved_pairings** — User-saved recommendations
- **training_progress** — Training card completion

### Sync Strategy

1. User action → Write to local database
2. Background sync every 15 minutes (if enabled)
3. Conflict resolution: Server wins (last-write-wins)
4. AsyncStorage tracks lastSync timestamp

### Manual Sync

Navigate to Settings → "Force Sync Now" to trigger immediate sync.

## Screens

### Dashboard

- Overview of cellar inventory
- COGS % and beverage cost metrics
- Top wine regions
- Quick links to daily tasks

### Cellar

- Search inventory by wine name or region
- View bin locations
- See cost per bottle and quantity
- Sortable by region, vintage, quantity

### Pairing

- Enter a dish name (e.g., "Grilled Salmon")
- AI recommends top 5 wines with scores
- View pairing rationale
- Save pairings for later

### Training

- Interactive flashcard deck
- Flip to reveal answers
- Progress tracking
- Sommelier-level wine questions

### Settings

- Enable/disable auto-sync
- View last sync time
- Clear local cache
- App version and support contact

## Configuration

### Auto-Sync Interval

Modify in `services/sync.js`:

```javascript
const syncInterval = setInterval(..., 15 * 60 * 1000); // 15 minutes
```

### Backend URL

Update `.env`:

```
EXPO_PUBLIC_API_URL=https://your-production-api.com/api
```

## Troubleshooting

### Sync Fails

1. Check internet connection
2. Verify backend API is running
3. Check `.env` for correct API URL
4. Clear cache in Settings

### App Crashes

1. Ensure Expo is up to date: `expo@latest`
2. Clear app cache: `Settings → Clear Local Cache`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

### Data Not Updating

1. Force sync from Settings
2. Check backend is responding: `curl http://api-url/api`
3. Verify SQLite tables exist: Check storage.js

## Deployment

### Production Build (via EAS)

```bash
# First, configure EAS
eas init

# Build for production
eas build --platform ios --release
eas build --platform android --release

# Submit to stores
eas submit
```

See [Expo EAS Documentation](https://docs.expo.dev/eas/) for details.

### Manual Distribution

```bash
# APK for Android testing
eas build --platform android --local

# IPA for iOS testing
eas build --platform ios --local
```

## Next Steps

- Section 5: Sales History & Menu Integration
- Section 6: Multi-Venue Sync Hub
- Section 7: IoT Ready (Cooler Temperature Monitoring)
- Section 8: Advanced Training & AR Features

## Support

For issues or feature requests, contact: support@luccca.io

---

**EchoServe Mobile v1.0.0** — Powered by LUCCCA Systems
