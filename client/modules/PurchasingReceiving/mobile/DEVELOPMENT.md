# Mobile Development Guide - Echo Ops React Native

This guide provides best practices and standards for developing the Echo Ops mobile application.

## 🚀 Quick Start

```bash
cd mobile
pnpm install
pnpm run metro          # Terminal 1
pnpm run android        # Terminal 2 - for Android
# or
pnpm run ios            # Terminal 2 - for iOS
```

## 📋 Development Workflow

### Creating a New Screen

1. Create the screen file in the appropriate directory:

   ```
   src/screens/feature/FeatureScreen.tsx
   ```

2. Use the following template:

   ```typescript
   import React, { useState, useEffect } from 'react';
   import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
   import { Feather } from '@expo/vector-icons';
   import { useAuthStore } from '@stores/authStore';

   export function FeatureScreen({ navigation, route }: any) {
     const { user } = useAuthStore();
     const [loading, setLoading] = useState(true);
     const [data, setData] = useState(null);

     useEffect(() => {
       loadData();
     }, []);

     const loadData = async () => {
       try {
         // Load data
       } catch (error) {
         console.error('Error loading data:', error);
       } finally {
         setLoading(false);
       }
     };

     if (loading) {
       return (
         <View className="flex-1 justify-center items-center bg-gray-50">
           <ActivityIndicator size="large" color="#ef4444" />
         </View>
       );
     }

     return (
       <ScrollView className="flex-1 bg-gray-50">
         {/* Screen content */}
       </ScrollView>
     );
   }
   ```

3. Register the screen in `src/navigation/RootNavigator.tsx`

### Creating a New Store

```typescript
import { create } from "zustand";

interface FeatureState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  updateData: (data: any) => void;
  clearError: () => void;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  data: null,
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch data from API
      const response = await apiClient.get("/api/data");
      set({ data: response, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateData: (newData) => {
    set((state) => ({
      data: state.data ? [...state.data, newData] : [newData],
    }));
  },

  clearError: () => set({ error: null }),
}));
```

### Creating a New Service

```typescript
import { apiClient } from "./apiClient";

class FeatureService {
  async getFeatures() {
    return apiClient.get("/api/features");
  }

  async createFeature(data: any) {
    return apiClient.post("/api/features", data);
  }

  async updateFeature(id: string, data: any) {
    return apiClient.put(`/api/features/${id}`, data);
  }

  async deleteFeature(id: string) {
    return apiClient.delete(`/api/features/${id}`);
  }
}

export const featureService = new FeatureService();
```

## 🎨 Styling Guidelines

### Using NativeWind (Tailwind for React Native)

```typescript
import { View, Text } from 'react-native';

export function StyledComponent() {
  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        Title
      </Text>
      <Text className="text-gray-600 text-base">
        Body text
      </Text>
    </View>
  );
}
```

### Common Classes

- **Spacing**: `p-4`, `m-2`, `mb-3`, `px-4`, `py-3`
- **Colors**: `bg-white`, `bg-red-500`, `text-gray-900`, `text-red-600`
- **Typography**: `font-bold`, `text-2xl`, `text-center`
- **Flexbox**: `flex-1`, `flex-row`, `items-center`, `justify-between`
- **Borders**: `border`, `border-gray-200`, `rounded-lg`

### Design System

**Colors**:

- Primary: `#ef4444` (red-500)
- Secondary: `#3b82f6` (blue-500)
- Success: `#10b981` (green-500)
- Warning: `#f59e0b` (amber-500)
- Error: `#ef4444` (red-500)
- Neutral: `#6b7280` (gray-500)

**Spacing Scale**:

- `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px

## 🔍 Navigation Patterns

### Basic Navigation

```typescript
// Navigate to screen
navigation.navigate("ScreenName");

// Navigate with params
navigation.navigate("Details", { itemId: 123 });

// Go back
navigation.goBack();

// Reset navigation
navigation.reset({
  index: 0,
  routes: [{ name: "Home" }],
});
```

### Type-Safe Navigation

Use the `NavParams` type for navigation:

```typescript
import { NavParams } from "@types/index";

navigation.navigate("OutletDetails", { outletId: "123" });
```

## 📡 API Integration

### Making API Calls

```typescript
import { apiClient } from "@services/apiClient";

async function fetchData() {
  try {
    const data = await apiClient.get("/api/endpoint");
    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
```

### Error Handling

```typescript
import { Alert } from "react-native";

try {
  await apiClient.post("/api/endpoint", payload);
} catch (error: any) {
  Alert.alert("Error", error.message || "Something went wrong");
}
```

### Interceptors

The API client automatically:

- Adds authorization headers
- Handles 401 responses by logging out
- Sets content-type to JSON

## 💾 Offline Data Management

### Storing Data Locally

```typescript
import { storageService } from "@services/storageService";

// Save data
await storageService.setItem("deliveries", deliveriesData);

// Retrieve data
const data = await storageService.getItem("deliveries");

// Clear all data
await storageService.clear();
```

### Offline-First Pattern

```typescript
export function MyComponent() {
  const [data, setData] = useState(null);
  const { isConnected } = useConnectivity();

  useEffect(() => {
    loadData();
  }, [isConnected]);

  const loadData = async () => {
    try {
      if (isConnected) {
        // Fetch from API
        const response = await apiClient.get('/api/data');
        await storageService.setItem('data', response);
        setData(response);
      } else {
        // Use cached data
        const cached = await storageService.getItem('data');
        setData(cached);
      }
    } catch (error) {
      // Show error or use cached data
    }
  };

  return <View>{/* Render component */}</View>;
}
```

## 🔔 Notifications

### Push Notifications Setup

```typescript
import { notificationService } from "@services/notificationService";

// Register on app start
useEffect(() => {
  const token = await notificationService.registerForPushNotifications();
  console.log("Push token:", token);
}, []);

// Listen for notifications
useEffect(() => {
  const subscription = notificationService.addNotificationResponseListener(
    (notification) => {
      console.log("Notification received:", notification);
    },
  );

  return () => subscription.remove();
}, []);
```

### Sending Notifications

```typescript
// Send local notification
await notificationService.sendLocalNotification(
  "New Order",
  "Order #12345 received",
);

// Schedule notification
await notificationService.scheduleNotification(
  "Reminder",
  "Don't forget to count inventory",
  60, // 60 seconds
);
```

## 📸 Barcode Scanning

### Using the Scanner

```typescript
import { useScannerPermissions, parseBarcodeData } from '@utils/scanner';
import { CameraView } from 'expo-camera';

export function ScannerComponent() {
  const { isPermissionGranted, requestPermission } = useScannerPermissions();
  const [scanned, setScanned] = useState(false);

  if (!isPermissionGranted) {
    return (
      <TouchableOpacity onPress={requestPermission}>
        <Text>Request Camera Permission</Text>
      </TouchableOpacity>
    );
  }

  const handleBarcodeScanned = ({ type, data }: any) => {
    setScanned(true);
    const parsed = parseBarcodeData({ type, data });
    console.log('Parsed barcode:', parsed);
  };

  return (
    <CameraView
      onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      style={{ flex: 1 }}
    />
  );
}
```

## 🧪 Testing

### Unit Testing Example

```typescript
import { describe, it, expect } from "@jest/globals";
import { formatCurrency, capitalizeFirstLetter } from "@utils/formatting";

describe("Formatting Utilities", () => {
  it("should format currency correctly", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });

  it("should capitalize first letter", () => {
    expect(capitalizeFirstLetter("hello")).toBe("Hello");
  });
});
```

### Component Testing Example

```typescript
import { render, screen } from '@testing-library/react-native';
import { MyComponent } from '@screens/MyComponent';

describe('MyComponent', () => {
  it('should render title', () => {
    render(<MyComponent />);
    expect(screen.getByText('Title')).toBeTruthy();
  });
});
```

## 🔐 Security Best Practices

1. **Never store sensitive data** in plain text

   ```typescript
   // ❌ Don't do this
   await storageService.setItem("authToken", token);

   // ✅ Do this - use Supabase session management
   // Supabase handles token storage securely
   ```

2. **Always validate user input**

   ```typescript
   import { z } from "zod";

   const schema = z.object({
     email: z.string().email(),
     password: z.string().min(6),
   });

   const validated = schema.parse(userData);
   ```

3. **Use HTTPS only**
   - Ensure all API endpoints use HTTPS
   - Configure environment variables correctly

4. **Implement proper error handling**

   ```typescript
   // ❌ Don't expose sensitive details
   Alert.alert("Error", error.message);

   // ✅ Show user-friendly message
   Alert.alert("Error", "Unable to load data. Please try again.");
   ```

## 📝 Code Organization

### File Naming

- Screens: `ScreenNameScreen.tsx`
- Components: `ComponentName.tsx`
- Stores: `featureStore.ts`
- Services: `featureService.ts`
- Utilities: `featureUtils.ts`
- Hooks: `useFeature.ts`

### Import Organization

```typescript
// 1. React & React Native imports
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";

// 2. Third-party imports
import { Feather } from "@expo/vector-icons";

// 3. Local imports
import { useAuthStore } from "@stores/authStore";
import { apiClient } from "@services/apiClient";
import { formatCurrency } from "@utils/formatting";
```

## 🐛 Debugging

### Using React Native Debugger

1. Install: `brew install react-native-debugger`
2. Run the app
3. Open React Native Debugger (Cmd+Ctrl+Z on iOS, shake device on Android)
4. Check Redux/Zustand state, network requests, etc.

### Logging

```typescript
// Use console methods for different levels
console.log("Info:", data);
console.warn("Warning:", message);
console.error("Error:", error);

// Use React Native debugger to view logs
// Cmd+Ctrl+Z on iOS or shake device on Android
```

### Performance Monitoring

```typescript
import { Feather } from "@expo/vector-icons";

// Monitor component renders
console.time("componentName");
// ... component code
console.timeEnd("componentName");
```

## 📚 Resources

- [React Native Docs](https://reactnative.dev/docs)
- [Expo Docs](https://docs.expo.dev)
- [NativeWind Docs](https://www.nativewind.dev)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [React Navigation Docs](https://reactnavigation.org)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes following the guidelines above
3. Test thoroughly
4. Submit a pull request with detailed description

## ❓ FAQs

**Q: How do I add a new screen?**
A: Create a file in `src/screens/`, then register it in `RootNavigator.tsx`

**Q: How do I manage global state?**
A: Use Zustand stores in `src/stores/`

**Q: How do I make API calls?**
A: Use `apiClient` from `@services/apiClient`

**Q: How do I store data offline?**
A: Use `storageService` from `@services/storageService`

**Q: How do I debug the app?**
A: Use React Native Debugger (Cmd+Ctrl+Z on iOS)

---

**Version**: 1.0.0
