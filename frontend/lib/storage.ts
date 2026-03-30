import { useSyncExternalStore } from "react";

const STORAGE_EVENT = "talentcore-storage";

function dispatchStorageUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

export function readStoredNumber(key: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(key);
  return raw ? Number(raw) || 0 : 0;
}

export function writeStoredNumber(key: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
  dispatchStorageUpdate();
}

export function incrementStoredNumber(key: string, incrementBy = 1) {
  writeStoredNumber(key, readStoredNumber(key) + incrementBy);
}

export function useStoredNumber(key: string) {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => callback();
      window.addEventListener("storage", handler);
      window.addEventListener(STORAGE_EVENT, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(STORAGE_EVENT, handler);
      };
    },
    () => readStoredNumber(key),
    () => 0
  );
}
