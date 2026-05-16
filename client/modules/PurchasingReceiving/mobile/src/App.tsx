import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { RootNavigator } from "@navigation/RootNavigator";
import { useAuthStore } from "@stores/authStore";
import { LoadingScreen } from "@screens/LoadingScreen";
SplashScreen.preventAutoHideAsync();
export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const { initialize, isInitialized } = useAuthStore();
  useEffect(() => {
    async function prepare() {
      try {
        await initialize();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);
  if (!appIsReady || !isInitialized) {
    return <LoadingScreen />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {" "}
      <NavigationContainer>
        {" "}
        <RootNavigator />{" "}
      </NavigationContainer>{" "}
    </GestureHandlerRootView>
  );
}
