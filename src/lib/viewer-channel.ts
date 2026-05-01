// Cross-window channel for the external viewer.
// Uses BroadcastChannel when available; falls back to localStorage events.

import { STORAGE_KEYS } from "./dm-storage";

const CHANNEL_NAME = "dm-viewer-v1";

export type ViewerMessage =
  | { type: "image"; src: string | null; name?: string }
  | { type: "request-state" };

export function createViewerChannel() {
  const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

  return {
    post(msg: ViewerMessage) {
      if (bc) bc.postMessage(msg);
      try {
        // Fallback: piggyback on storage event for browsers without BroadcastChannel.
        // Include a timestamp so the same payload triggers a new storage event.
        window.localStorage.setItem(
          STORAGE_KEYS.currentImage + ".payload",
          JSON.stringify({ ...msg, ts: Date.now() }),
        );
      } catch {
        /* ignore quota */
      }
    },
    subscribe(handler: (msg: ViewerMessage) => void) {
      const onBc = (e: MessageEvent<ViewerMessage>) => handler(e.data);
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEYS.currentImage + ".payload" && e.newValue) {
          try {
            handler(JSON.parse(e.newValue));
          } catch {
            /* ignore */
          }
        }
      };
      bc?.addEventListener("message", onBc);
      window.addEventListener("storage", onStorage);
      return () => {
        bc?.removeEventListener("message", onBc);
        window.removeEventListener("storage", onStorage);
      };
    },
    close() {
      bc?.close();
    },
  };
}

export async function fileToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
