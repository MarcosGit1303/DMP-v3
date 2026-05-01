import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Group, Track } from "@/lib/dm-types";
import { STORAGE_KEYS, loadJSON, saveJSON } from "@/lib/dm-storage";
import { loadYouTubeAPI, parseYouTubeId, sanitizeName } from "@/lib/youtube";

export interface ActivePlayer {
  /** Stable id for this layer/slot (not the track id) */
  layerId: string;
  trackId: string;
  ytId: string;
  title: string;
  volume: number;
  state: "loading" | "playing" | "paused" | "error";
}

interface MusicContextValue {
  tracks: Track[];
  groups: Group[];
  activePlayers: ActivePlayer[];
  errorMessage: string | null;

  addTrack: (url: string, customName?: string) => { ok: boolean; error?: string };
  removeTrack: (id: string) => void;

  /** Stop everything currently playing and start this track as a single layer. */
  playSolo: (trackId: string) => void;
  /** Add a new layer playing this track in parallel (independent volume). */
  addLayer: (trackId: string) => void;
  /** Stop and remove a specific layer. */
  removeLayer: (layerId: string) => void;
  /** Pause/resume a specific layer. */
  pauseLayer: (layerId: string) => void;
  resumeLayer: (layerId: string) => void;
  /** Set per-layer volume 0..100 */
  setLayerVolume: (layerId: string, v: number) => void;
  /** Stop and remove every layer. */
  stopAll: () => void;
  pauseAll: () => void;
  resumeAll: () => void;

  createGroup: (name: string) => string;
  deleteGroup: (id: string) => void;
  addToGroup: (groupId: string, trackId: string) => void;
  removeFromGroup: (groupId: string, trackId: string) => void;
  /** Play every track of a group simultaneously as separate layers. */
  playGroup: (groupId: string) => void;

  /** Slot host registration: the MiniPlayer renders DIVs that will host iframes. */
  registerSlotEl: (layerId: string, el: HTMLDivElement | null) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

function makeId() {
  return Math.random().toString(36).slice(2, 11);
}

const DEFAULT_VOLUME = 70;

interface PlayerEntry {
  layerId: string;
  trackId: string;
  ytId: string;
  title: string;
  volume: number;
  yt: any | null; // YT.Player instance
  // Whether the player is ready to receive commands
  ready: boolean;
  // Pending action to apply once the player becomes ready (the iframe just mounted)
  pending: "play" | "pause" | null;
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>(() => loadJSON<Track[]>(STORAGE_KEYS.tracks, []));
  const [groups, setGroups] = useState<Group[]>(() => loadJSON<Group[]>(STORAGE_KEYS.groups, []));
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Internal mutable map of player entries by layerId
  const playersRef = useRef<Map<string, PlayerEntry>>(new Map());
  // Slot host elements registered by the MiniPlayer
  const slotElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => saveJSON(STORAGE_KEYS.tracks, tracks), [tracks]);
  useEffect(() => saveJSON(STORAGE_KEYS.groups, groups), [groups]);

  const refreshActive = useCallback(() => {
    const list: ActivePlayer[] = [];
    playersRef.current.forEach((p) => {
      let state: ActivePlayer["state"] = "loading";
      try {
        const s = p.yt?.getPlayerState?.();
        if (s === 1) state = "playing";
        else if (s === 2) state = "paused";
        else if (s === 3 || s === -1 || s === 5) state = "loading";
      } catch {
        /* noop */
      }
      list.push({
        layerId: p.layerId,
        trackId: p.trackId,
        ytId: p.ytId,
        title: p.title,
        volume: p.volume,
        state,
      });
    });
    setActivePlayers(list);
  }, []);

  // Periodic refresh (catches state transitions reliably)
  useEffect(() => {
    const t = setInterval(refreshActive, 1000);
    return () => clearInterval(t);
  }, [refreshActive]);

  const initPlayerForLayer = useCallback(
    async (layerId: string) => {
      const entry = playersRef.current.get(layerId);
      if (!entry || entry.yt) return;
      const host = slotElsRef.current.get(layerId);
      if (!host) return; // Will retry when registerSlotEl runs
      const YT = await loadYouTubeAPI();
      // Replace host content with a fresh inner div the API can take over
      host.innerHTML = "";
      const inner = document.createElement("div");
      host.appendChild(inner);
      const player = new YT.Player(inner, {
        height: "120",
        width: "200",
        videoId: entry.ytId,
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            const e = playersRef.current.get(layerId);
            if (!e) return;
            e.yt = player;
            e.ready = true;
            try {
              player.setVolume(e.volume);
              player.playVideo();
            } catch {
              /* noop */
            }
            refreshActive();
          },
          onStateChange: () => refreshActive(),
          onError: () => {
            setErrorMessage("Una pista no se pudo reproducir (privada, eliminada o bloqueada).");
            refreshActive();
          },
        },
      });
    },
    [refreshActive],
  );

  const registerSlotEl = useCallback(
    (layerId: string, el: HTMLDivElement | null) => {
      if (el) {
        slotElsRef.current.set(layerId, el);
        // If player entry exists but YT not yet created, init it now
        const entry = playersRef.current.get(layerId);
        if (entry && !entry.yt) {
          initPlayerForLayer(layerId);
        }
      } else {
        slotElsRef.current.delete(layerId);
      }
    },
    [initPlayerForLayer],
  );

  const removeLayerInternal = useCallback(
    (layerId: string) => {
      const entry = playersRef.current.get(layerId);
      if (entry?.yt) {
        try {
          entry.yt.stopVideo?.();
          entry.yt.destroy?.();
        } catch {
          /* noop */
        }
      }
      playersRef.current.delete(layerId);
      const host = slotElsRef.current.get(layerId);
      if (host) host.innerHTML = "";
      refreshActive();
    },
    [refreshActive],
  );

  const addLayer = useCallback(
    (trackId: string) => {
      const t = tracks.find((x) => x.id === trackId);
      if (!t) return;
      const layerId = makeId();
      const entry: PlayerEntry = {
        layerId,
        trackId: t.id,
        ytId: t.ytId,
        title: t.title,
        volume: DEFAULT_VOLUME,
        yt: null,
        ready: false,
        pending: "play",
      };
      playersRef.current.set(layerId, entry);
      setErrorMessage(null);
      refreshActive(); // triggers MiniPlayer to render slot, which calls registerSlotEl → initPlayerForLayer
    },
    [tracks, refreshActive],
  );

  const stopAll = useCallback(() => {
    Array.from(playersRef.current.keys()).forEach((id) => removeLayerInternal(id));
  }, [removeLayerInternal]);

  const playSolo = useCallback(
    (trackId: string) => {
      stopAll();
      addLayer(trackId);
    },
    [stopAll, addLayer],
  );

  const removeLayer = useCallback(
    (layerId: string) => removeLayerInternal(layerId),
    [removeLayerInternal],
  );

  const pauseLayer = useCallback(
    (layerId: string) => {
      const e = playersRef.current.get(layerId);
      try {
        e?.yt?.pauseVideo?.();
      } catch {
        /* noop */
      }
      refreshActive();
    },
    [refreshActive],
  );

  const resumeLayer = useCallback(
    (layerId: string) => {
      const e = playersRef.current.get(layerId);
      try {
        e?.yt?.playVideo?.();
      } catch {
        /* noop */
      }
      refreshActive();
    },
    [refreshActive],
  );

  const setLayerVolume = useCallback(
    (layerId: string, v: number) => {
      const e = playersRef.current.get(layerId);
      if (!e) return;
      e.volume = v;
      try {
        e.yt?.setVolume?.(v);
      } catch {
        /* noop */
      }
      refreshActive();
    },
    [refreshActive],
  );

  const pauseAll = useCallback(() => {
    playersRef.current.forEach((e) => {
      try {
        e.yt?.pauseVideo?.();
      } catch {
        /* noop */
      }
    });
    refreshActive();
  }, [refreshActive]);

  const resumeAll = useCallback(() => {
    playersRef.current.forEach((e) => {
      try {
        e.yt?.playVideo?.();
      } catch {
        /* noop */
      }
    });
    refreshActive();
  }, [refreshActive]);

  const addTrack = useCallback((url: string, customName?: string) => {
    const ytId = parseYouTubeId(url);
    if (!ytId) return { ok: false, error: "URL de YouTube no válida." };
    const name = sanitizeName(customName || `Pista ${ytId}`);
    if (!name) return { ok: false, error: "Nombre no válido." };
    setTracks((prev) => [
      ...prev,
      {
        id: makeId(),
        ytId,
        title: name,
        url: sanitizeName(url, 500),
        addedAt: Date.now(),
      },
    ]);
    setErrorMessage(null);
    return { ok: true };
  }, []);

  const removeTrack = useCallback(
    (id: string) => {
      // Stop any active layers using this track
      Array.from(playersRef.current.values())
        .filter((p) => p.trackId === id)
        .forEach((p) => removeLayerInternal(p.layerId));
      setTracks((prev) => prev.filter((t) => t.id !== id));
      setGroups((prev) =>
        prev.map((g) => ({ ...g, trackIds: g.trackIds.filter((x) => x !== id) })),
      );
    },
    [removeLayerInternal],
  );

  const createGroup = useCallback((name: string) => {
    const clean = sanitizeName(name, 50);
    const id = makeId();
    setGroups((prev) => [...prev, { id, name: clean || "Grupo", trackIds: [] }]);
    return id;
  }, []);
  const deleteGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);
  const addToGroup = useCallback((groupId: string, trackId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId && !g.trackIds.includes(trackId)
          ? { ...g, trackIds: [...g.trackIds, trackId] }
          : g,
      ),
    );
  }, []);
  const removeFromGroup = useCallback((groupId: string, trackId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, trackIds: g.trackIds.filter((x) => x !== trackId) } : g,
      ),
    );
  }, []);

  const playGroup = useCallback(
    (groupId: string) => {
      const g = groups.find((x) => x.id === groupId);
      if (!g || !g.trackIds.length) return;
      // Replace current scene: stop everything, then add one layer per track
      stopAll();
      g.trackIds.forEach((tid) => addLayer(tid));
    },
    [groups, stopAll, addLayer],
  );

  const value = useMemo<MusicContextValue>(
    () => ({
      tracks,
      groups,
      activePlayers,
      errorMessage,
      addTrack,
      removeTrack,
      playSolo,
      addLayer,
      removeLayer,
      pauseLayer,
      resumeLayer,
      setLayerVolume,
      stopAll,
      pauseAll,
      resumeAll,
      createGroup,
      deleteGroup,
      addToGroup,
      removeFromGroup,
      playGroup,
      registerSlotEl,
    }),
    [
      tracks,
      groups,
      activePlayers,
      errorMessage,
      addTrack,
      removeTrack,
      playSolo,
      addLayer,
      removeLayer,
      pauseLayer,
      resumeLayer,
      setLayerVolume,
      stopAll,
      pauseAll,
      resumeAll,
      createGroup,
      deleteGroup,
      addToGroup,
      removeFromGroup,
      playGroup,
      registerSlotEl,
    ],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
