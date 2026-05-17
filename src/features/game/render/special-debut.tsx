import { useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/core/theme/colors";
import { SPECIAL_DEBUT } from "@/features/game/stages/sample-stages";
import { getJson, setJson } from "@/core/persistence/store";

const SEEN_KEY = "onboarding.seenSpecials";

function getSeenSpecials(): string[] {
  return getJson<string[]>(SEEN_KEY, []);
}

interface SpecialDebutInfo {
  kind: string;
  label: string;
  emoji: string;
  description: string;
}

const SPECIAL_INFO: Record<string, SpecialDebutInfo> = {
  stripedH: {
    kind: "stripedH",
    label: "しましまピース！",
    emoji: "✨",
    description: "4つ横に揃えると生まれるよ！\nタップすると横1列を一気に消せる！",
  },
  wrapped: {
    kind: "wrapped",
    label: "ばくだんピース！",
    emoji: "💥",
    description: "L字やT字に揃えると生まれるよ！\n周り3×3を2回爆発させるよ！",
  },
  rainbow: {
    kind: "rainbow",
    label: "レインボーピース！",
    emoji: "🌈",
    description: "5つ一直線に揃えると生まれるよ！\nとなりのピースと同じ色を全部消せる！",
  },
};

interface SpecialDebutProps {
  stageId: number;
  onClose: () => void;
}

export function SpecialDebutNotice({ stageId, onClose }: SpecialDebutProps) {
  const info = useRef<SpecialDebutInfo | null>(null);
  const visible = useRef(false);

  useEffect(() => {
    const seen = getSeenSpecials();
    for (const [kind, debutStage] of Object.entries(SPECIAL_DEBUT)) {
      if (stageId === debutStage && !seen.includes(kind)) {
        const found = SPECIAL_INFO[kind];
        if (found) {
          info.current = found;
          visible.current = true;
          return;
        }
      }
    }
  }, [stageId]);

  if (!visible.current || !info.current) return null;

  const { label, emoji, description } = info.current;
  const kind = info.current.kind;

  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.desc}>{description}</Text>
          <Pressable
            onPress={() => {
              const seen = getSeenSpecials();
              if (!seen.includes(kind)) {
                setJson(SEEN_KEY, [...seen, kind]);
              }
              visible.current = false;
              onClose();
            }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>わかった！</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accent,
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    color: colors.ink,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 22,
    marginTop: 4,
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
