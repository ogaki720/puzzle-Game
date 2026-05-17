import { create } from "zustand";
import {
  MASCOT_CHEER_DURATION_MS,
  MASCOT_SAD_DURATION_MS,
  MASCOT_SLEEP_DELAY_MS,
  MASCOT_WAVE_CHANCE,
  MASCOT_WAVE_INTERVAL_MS,
} from "@/core/juicy";

export type MascotState =
  | "idle"
  | "wave"
  | "sleep"
  | "greet"
  | "cheer"
  | "sad"
  | "notice";

export const MASCOT_MESSAGES: Record<MascotState, string[]> = {
  idle: [],
  wave: ["ぴょん♪", "もちー♪", "やほー！"],
  sleep: ["Zzz…"],
  greet: ["はじめまして！", "いっしょにあそぼ♪"],
  cheer: ["やったね！", "すご〜い！", "さすが！"],
  sad: ["もう一回いっしょに…", "つぎはきっとできるよ！"],
  notice: ["ハートがいっぱいだよ♪"],
};

interface MascotStore {
  state: MascotState;
  message: string;
  greet: () => void;
  cheer: () => void;
  sad: () => void;
  notice: () => void;
  startIdleLoop: () => () => void;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export const useMascot = create<MascotStore>((set, get) => ({
  state: "idle",
  message: "",

  greet() {
    set({ state: "greet", message: pickRandom(MASCOT_MESSAGES.greet) });
    setTimeout(() => set({ state: "idle", message: "" }), 2500);
  },

  cheer() {
    set({ state: "cheer", message: pickRandom(MASCOT_MESSAGES.cheer) });
    setTimeout(() => set({ state: "idle", message: "" }), MASCOT_CHEER_DURATION_MS);
  },

  sad() {
    set({ state: "sad", message: pickRandom(MASCOT_MESSAGES.sad) });
    setTimeout(() => set({ state: "idle", message: "" }), MASCOT_SAD_DURATION_MS);
  },

  notice() {
    set({ state: "notice", message: pickRandom(MASCOT_MESSAGES.notice) });
    setTimeout(() => set({ state: "idle", message: "" }), 2000);
  },

  startIdleLoop() {
    let sleepTimer: ReturnType<typeof setTimeout> | null = null;
    let waveTimer: ReturnType<typeof setInterval> | null = null;

    const resetSleepTimer = () => {
      if (sleepTimer) clearTimeout(sleepTimer);
      sleepTimer = setTimeout(() => {
        const { state } = get();
        if (state === "idle") set({ state: "sleep", message: "" });
      }, MASCOT_SLEEP_DELAY_MS);
    };

    resetSleepTimer();

    waveTimer = setInterval(() => {
      const { state } = get();
      if (state !== "idle") return;
      if (Math.random() > MASCOT_WAVE_CHANCE) return;
      set({ state: "wave", message: pickRandom(MASCOT_MESSAGES.wave) });
      setTimeout(() => {
        set((s) => s.state === "wave" ? { state: "idle", message: "" } : s);
        resetSleepTimer();
      }, 1200);
    }, MASCOT_WAVE_INTERVAL_MS);

    return () => {
      if (sleepTimer) clearTimeout(sleepTimer);
      if (waveTimer) clearInterval(waveTimer);
    };
  },
}));
