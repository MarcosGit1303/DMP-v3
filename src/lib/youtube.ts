// YouTube URL parsing + IFrame API loader.

const YT_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (YT_ID_REGEX.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return YT_ID_REGEX.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && YT_ID_REGEX.test(v)) return v;
      // /embed/ID or /shorts/ID or /live/ID
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

export function sanitizeName(name: string, max = 80): string {
  return name.replace(/[\u0000-\u001F\u007F<>]/g, "").trim().slice(0, max);
}

// IFrame API singleton loader
let ytApiPromise: Promise<typeof window.YT> | null = null;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function loadYouTubeAPI(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
  });
  return ytApiPromise;
}
