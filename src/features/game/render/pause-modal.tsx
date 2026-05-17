import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/core/theme/colors";

interface PauseModalProps {
  visible: boolean;
  onResume: () => void;
  onRetry: () => void;
  onQuit: () => void;
}

export function PauseModal({ visible, onResume, onRetry, onQuit }: PauseModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onResume}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>いったん きゅうけい</Text>
          <View style={styles.actions}>
            <PrimaryButton label="つづける" onPress={onResume} />
            <SecondaryButton label="やりなおす" onPress={onRetry} />
            <SecondaryButton label="やめる" onPress={onQuit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ResultModalProps {
  visible: boolean;
  won: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
  onRetry: () => void;
  onNext?: () => void;
  onQuit: () => void;
}

export function ResultModal({ visible, won, score, stars, onRetry, onNext, onQuit }: ResultModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, won ? styles.titleWin : styles.titleLose]}>
            {won ? "クリア！" : "ざんねん"}
          </Text>
          {won && (
            <View style={styles.starRow}>
              {[1, 2, 3].map((i) => (
                <Text key={i} style={[styles.star, i <= stars && styles.starOn]}>
                  ★
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.score}>スコア: {score.toLocaleString()}</Text>
          <View style={styles.actions}>
            {won && onNext && <PrimaryButton label="つぎへ" onPress={onNext} />}
            <SecondaryButton label="もう一回" onPress={onRetry} />
            <SecondaryButton label="マップへ" onPress={onQuit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnP, pressed && styles.btnPressed]}>
      <Text style={styles.btnPText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnS, pressed && styles.btnPressed]}>
      <Text style={styles.btnSText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
  },
  titleWin: {
    color: colors.accent,
  },
  titleLose: {
    color: colors.inkSoft,
  },
  starRow: {
    flexDirection: "row",
    gap: 8,
  },
  star: {
    fontSize: 40,
    color: "#E6D7DF",
  },
  starOn: {
    color: "#FFC93B",
  },
  score: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: "700",
  },
  actions: {
    width: "100%",
    gap: 8,
  },
  btnP: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: "center",
  },
  btnPText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  btnS: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: colors.accentSoft,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
  btnSText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
