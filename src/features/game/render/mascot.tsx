import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/core/theme/colors";
import { type MascotState, useMascot } from "@/features/game/state/mascot.store";

const EMOJI: Record<MascotState, string> = {
  idle:   "🐰",
  wave:   "🐰",
  sleep:  "😴",
  greet:  "🐰",
  cheer:  "🎉",
  sad:    "🥺",
  notice: "💕",
};

interface MascotProps {
  size?: number;
  onPress?: () => void;
}

export function Mascot({ size = 80, onPress }: MascotProps) {
  const mascotState = useMascot((s) => s.state);
  const message = useMascot((s) => s.message);
  const startIdleLoop = useMascot((s) => s.startIdleLoop);
  const greet = useMascot((s) => s.greet);

  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const prevState = useRef<MascotState>("idle");

  useEffect(() => {
    const stop = startIdleLoop();
    greet();
    return stop;
  }, [startIdleLoop, greet]);

  // Animate based on state transitions
  useEffect(() => {
    if (mascotState === prevState.current) return;
    prevState.current = mascotState;

    switch (mascotState) {
      case "wave":
        scale.value = withSequence(
          withSpring(1.2, { damping: 8 }),
          withSpring(1.0, { damping: 12 }),
        );
        translateY.value = withSequence(
          withTiming(-8, { duration: 150, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 200, easing: Easing.in(Easing.bounce) }),
        );
        break;
      case "cheer":
        scale.value = withSequence(
          withSpring(1.35, { damping: 6 }),
          withRepeat(
            withSequence(
              withTiming(1.2, { duration: 200 }),
              withTiming(1.35, { duration: 200 }),
            ),
            3,
            true,
          ),
          withSpring(1.0),
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(-14, { duration: 200, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 200, easing: Easing.in(Easing.bounce) }),
          ),
          3,
          false,
        );
        break;
      case "sad":
        scale.value = withSpring(0.88, { damping: 14 });
        translateY.value = withTiming(6, { duration: 300 });
        break;
      case "idle":
        scale.value = withSpring(1.0, { damping: 12 });
        translateY.value = withSpring(0, { damping: 12 });
        break;
      case "sleep":
        scale.value = withTiming(0.9, { duration: 800 });
        break;
      case "greet":
        scale.value = withSpring(1.25, { damping: 7 });
        translateY.value = withSequence(
          withTiming(-12, { duration: 200 }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.bounce) }),
        );
        break;
      default:
        scale.value = withSpring(1.0);
        translateY.value = withSpring(0);
    }
  }, [mascotState, scale, translateY]);

  // Gentle idle breathing
  const breathe = useSharedValue(1);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [breathe]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value * (mascotState === "idle" || mascotState === "sleep" ? breathe.value : 1) },
    ],
  }));

  return (
    <View style={styles.container}>
      {message.length > 0 && (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      )}
      <Pressable
        onPress={() => {
          onPress?.();
          if (mascotState === "sleep") {
            useMascot.setState({ state: "idle", message: "" });
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="マスコット もちうさ"
      >
        <Animated.View style={animStyle}>
          <Text style={[styles.emoji, { fontSize: size }]}>
            {EMOJI[mascotState]}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  bubble: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.accentSoft,
    maxWidth: 200,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: "600",
    textAlign: "center",
  },
  emoji: {
    textAlign: "center",
    lineHeight: undefined,
  },
});
