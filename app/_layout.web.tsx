import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/core/theme/colors";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LoadSkiaWeb } = require("@shopify/react-native-skia/lib/module/web") as {
  LoadSkiaWeb: (opts?: { locateFile?: (file: string) => string }) => Promise<void>;
};

export default function RootLayoutWeb() {
  const [skiaReady, setSkiaReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    LoadSkiaWeb({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
    })
      .then(() => setSkiaReady(true))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Skia の読み込みに失敗しました");
      });
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠ {error}</Text>
      </View>
    );
  }

  if (!skiaReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>よみこみ中…</Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.inkSoft,
  },
  errorText: {
    fontSize: 14,
    color: "red",
    textAlign: "center",
    padding: 24,
  },
});
