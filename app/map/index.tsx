import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { colors } from "@/core/theme/colors";

export default function MapRoute() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>ワールドマップ</Text>
        <Text style={styles.note}>※ M4 で実装予定</Text>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← もどる</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.ink },
  note: { fontSize: 14, color: colors.inkSoft },
  back: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
  backText: { color: colors.accent, fontWeight: "600" },
});
