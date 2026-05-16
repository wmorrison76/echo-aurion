# Echo Ops Mobile - React Native Application

A comprehensive mobile application for managing multi-outlet receiving, inventory, and purchasing operations. Built with React Native, Expo, and Supabase.

## 📋 Features

- **Multi-Outlet Support**: Seamlessly switch between multiple outlet locations
- **User Authentication**: Secure login with role-based access control
- **Receiving Management**: Track incoming deliveries and invoices
- **Inventory Management**: Real-time inventory tracking and low stock alerts
- **Purchase Orders**: Create and manage purchase orders
- **Barcode Scanning**: Built-in barcode/QR code scanning capabilities
- **Offline Support**: Full offline functionality with automatic sync
- **Push Notifications**: Real-time alerts for critical events
- **Responsive Design**: Optimized for phones and tablets

## 🛠️ Technology Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **HTTP Client**: Axios
- **Navigation**: React Navigation with Bottom Tabs & Native Stack
- **Barcode Scanning**: Expo Camera + Barcode Scanner
- **Storage**: AsyncStorage for offline data
- **Date Handling**: date-fns

## 📦 Installation

### Prerequisites

- Node.js 20+ and npm/pnpm
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)

### Setup Steps

1. **Install dependencies**:

   ```bash
   cd mobile
   pnpm install
   # or npm install
   ```

2. **Configure environment variables**:

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your configuration:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_PUBLIC_API_URL=http://localhost:8080
   ```

3. **Start the development server**:
   ```bash
   pnpm run metro
   # In another terminal:
   pnpm run android    # For Android
   pnpm run ios        # For iOS
   ```

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── screens/              # Screen components
│   │   ├��─ auth/            # Login & Register screens
│   │   ├── dashboard/       # Dashboard screens
│   │   ├── receiving/       # Receiving management screens
│   │   ├── inventory/       # Inventory screens
│   │   ├── orders/          # Purchase order screens
│   │   ├── outlets/         # Outlet detail screens
│   │   ├── invoices/        # Invoice detail screens
│   │   └── profile/         # User profile screen
│   ├── navigation/           # Navigation structure
│   ├── stores/               # Zustand state management
│   ├── services/             # API & external services
│   │   ├── supabaseClient.ts
│   │   ├── apiClient.ts
│   │   ├── storageService.ts
│   │   └── notificationService.ts
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   │   ├── scanner.ts       # Barcode scanning utilities
│   │   ├── dateTime.ts      # Date formatting utilities
│   │   └── formatting.ts    # Number & string formatting
│   ├── types/                # TypeScript type definitions
│   └── App.tsx               # App entry point
├── app.json                  # Expo configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── babel.config.js           # Babel configuration
└── package.json              # Dependencies

```

## 🔐 Authentication

The app uses Supabase authentication with role-based access control:

### Supported Roles

- **Admin**: Full system access
- **Manager**: Outlet management and staff oversight
- **Receiver**: Receiving and delivery management
- **Chef**: Inventory and recipe management
- **Finance**: Financial reporting and analytics

### Login Flow

1. User enters email and password
2. Supabase authenticates credentials
3. User profile is fetched from database
4. Auth state is persisted locally for offline access
5. User is redirected to appropriate dashboard

## 📱 Main Features

### Dashboard

- Multi-outlet metrics summary
- KPI cards (pending orders, deliveries, low stock items)
- Quick action shortcuts
- Real-time status updates

### Receiving

- List of incoming deliveries
- Filter by status (pending, in_transit, delivered, rejected)
- Invoice details and line items
- Mark deliveries as received or rejected
- Barcode scanning support

### Inventory

- Browse all inventory items
- Search by product name or SKU
- Filter low stock items
- Edit item quantities
- Track minimum and maximum stock levels

### Orders

- Create new purchase orders
- View order status
- Filter by status
- Track order timeline
- Vendor management

### Profile

- User account information
- Outlet switching
- Settings (notifications, dark mode)
- Change password
- Logout

## 🔗 API Integration

The app connects to the Echo Ops backend API:

```typescript
// Example API calls using apiClient
import { apiClient } from "@services/apiClient";

// Fetch deliveries
const deliveries = await apiClient.get("/api/deliveries");

// Create purchase order
const order = await apiClient.post("/api/orders", {
  vendor: "Vendor Name",
  total_amount: 1000,
});

// Update delivery status
await apiClient.patch("/api/deliveries/:id", {
  status: "received",
});
```

## 📡 Real-time Features

The app uses Supabase real-time subscriptions for live updates:

```typescript
// Subscribe to delivery changes
const subscription = supabase
  .from("deliveries")
  .on("*", (payload) => {
    console.log("Delivery updated:", payload);
    fetchDeliveries();
  })
  .subscribe();
```

## 🔄 Offline Functionality

The app automatically caches data locally and syncs when connection is restored:

```typescript
// Storage service for offline data
import { storageService } from "@services/storageService";

// Save data locally
await storageService.setItem("deliveries", deliveriesData);

// Retrieve cached data
const cachedData = await storageService.getItem("deliveries");
```

## 📸 Barcode Scanning

Built-in barcode and QR code scanning:

```typescript
import { useScannerPermissions, parseBarcodeData } from "@utils/scanner";

const { isPermissionGranted, requestPermission } = useScannerPermissions();

// Parse scanned data
const parsedData = parseBarcodeData({
  type: "code128",
  data: "12345678",
});
```

## 🔔 Push Notifications

Configure push notifications for real-time alerts:

```typescript
import { notificationService } from "@services/notificationService";

// Register for push notifications
const token = await notificationService.registerForPushNotifications();

// Send local notification
await notificationService.sendLocalNotification(
  "New Delivery",
  "Delivery from Vendor XYZ received",
);
```

## 🧪 Testing

Run tests using Jest and Vitest:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- screens/auth/LoginScreen.test.tsx
```

## 🚀 Deployment

### Build for Production

**Android**:

```bash
cd mobile
pnpm run build:android
# Upload APK to Google Play Store
```

**iOS**:

```bash
cd mobile
pnpm run build:ios
# Upload IPA to App Store Connect
```

### Environment Variables

Ensure all environment variables are set in Expo's production environment:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL`

## 📝 Development Guidelines

### Code Style

- Follow TypeScript strict mode
- Use functional components with hooks
- Implement proper error handling
- Add PropTypes or TypeScript interfaces for all components

### Component Structure

```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

export function MyComponent({ title, onPress }: MyComponentProps) {
  return (
    <View className="p-4">
      <Text className="font-bold">{title}</Text>
    </View>
  );
}
```

### State Management

Use Zustand for global state:

```typescript
import { create } from "zustand";

interface MyStore {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### API Calls

Always handle errors and loading states:

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setLoading(true);
    const data = await apiClient.get("/api/data");
    // Handle data
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    setLoading(false);
  }
};
```

## 🐛 Troubleshooting

### Metro bundler issues

```bash
# Clear cache and restart
pnpm run metro -- --reset-cache
```

### Android emulator not connecting

```bash
# Reverse port mapping
adb reverse tcp:8081 tcp:8081
```

### iOS simulator issues

```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Supabase connection errors

- Verify environment variables
- Check network connectivity
- Confirm Supabase project is running
- Check firewall and proxy settings

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev)
- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Navigation Guide](https://reactnavigation.org)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 📄 License

This mobile application is part of the Echo Ops system. See LICENSE file for details.

## 🤝 Support

For issues, feature requests, or contributions:

1. Check existing issues and documentation
2. Create a detailed bug report with steps to reproduce
3. Submit pull requests with comprehensive descriptions
4. Follow the code style and testing guidelines

---

**Version**: 1.0.0  
**Last Updated**: 2024
