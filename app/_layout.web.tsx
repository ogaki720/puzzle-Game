/**
 * Web root layout.
 *
 * Previously loaded Skia CanvasKit WASM here, but board rendering on web now
 * uses a pure React Native View implementation (board-canvas.web.tsx) which
 * never imports @shopify/react-native-skia. No Skia loading required.
 */
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/core/theme/colors";

export default function RootLayoutWeb() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade",
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
