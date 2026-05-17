import { Platform } from "react-native";

type StorageValue = string | null;

function getStorage() {
  if (Platform.OS === "web") {
    return {
      getString: (key: string): StorageValue => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      set: (key: string, value: string): void => {
        try {
          localStorage.setItem(key, value);
        } catch { /* ignore */ }
      },
      delete: (key: string): void => {
        try {
          localStorage.removeItem(key);
        } catch { /* ignore */ }
      },
    };
  }
  // Native: use react-native-mmkv
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMMKV } = require("react-native-mmkv") as typeof import("react-native-mmkv");
  const store = createMMKV({ id: "mochipop" });
  return {
    getString: (key: string): StorageValue => store.getString(key) ?? null,
    set: (key: string, value: string) => store.set(key, value),
    delete: (key: string) => store.remove(key),
  };
}

const _store = getStorage();

export function getJson<T>(key: string, fallback: T): T {
  try {
    const raw = _store.getString(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJson<T>(key: string, value: T): void {
  _store.set(key, JSON.stringify(value));
}

export function deleteKey(key: string): void {
  _store.delete(key);
}
