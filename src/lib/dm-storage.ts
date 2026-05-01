// Lightweight typed localStorage helpers for the DM screen.

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization issue — ignore silently */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  imagesMeta: "dm.images.meta.v1",
  currentImage: "dm.images.current.v1",
  tracks: "dm.music.tracks.v1",
  groups: "dm.music.groups.v1",
  queue: "dm.music.queue.v1",
} as const;
