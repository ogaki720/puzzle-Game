import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { colors } from "@/core/theme/colors";
import { Mascot } from "@/features/game/render/mascot";

export default function MenuRoute() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>もちポップ</Text>
          <Text style={styles.subtitle}>もちもちアニマルが、ぷにっと弾ける。</Text>
          <Mascot size={80} />
        </View>

        <View style={styles.buttons}>
          <PrimaryButton label="はじめる" onPress={() => router.push("/map")} />
          <SecondaryButton label="ずかん" onPress={() => router.push("/codex")} />
          <SecondaryButton label="せってい" onPress={() => router.push("/settings")} />
        </View>

        <Text style={styles.version}>v0.1.0</Text>
      </View>
    </SafeAreaView>
  );
}

type ButtonProps = { label: string; onPress: () => void };

function PrimaryButton({ label, onPress }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
    >
      <Text style={styles.btnPrimaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
    >
      <Text style={styles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 52,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  buttons: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: { color: "white", fontSize: 20, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
  btnSecondaryText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  version: { fontSize: 12, color: colors.inkSoft },
});
