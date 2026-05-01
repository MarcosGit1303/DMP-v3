import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ImageItem, ImageMeta } from "@/lib/dm-types";
import { STORAGE_KEYS, loadJSON, saveJSON } from "@/lib/dm-storage";
import { createViewerChannel, fileToDataURL } from "@/lib/viewer-channel";

interface ImagesContextValue {
  images: ImageItem[];
  folders: string[];
  selectedFolder: string | null;
  setSelectedFolder: (f: string | null) => void;
  currentImageId: string | null;
  setCurrentImageId: (id: string | null) => void;
  addFiles: (files: FileList | File[]) => Promise<void>;
  clearAll: () => void;
  removeImage: (id: string) => void;
  status: string;
  openExternalViewer: () => void;
  externalViewerOpen: boolean;
}

const ImagesContext = createContext<ImagesContextValue | null>(null);

const BATCH = 20;

function makeId() {
  return Math.random().toString(36).slice(2, 11);
}

function folderFromPath(path: string, name: string): string {
  if (!path || path === name) return "Sin carpeta";
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "Sin carpeta";
}

export function ImagesProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const objectUrls = useRef<Set<string>>(new Set());
  const filesById = useRef<Map<string, File>>(new Map());
  const channelRef = useRef<ReturnType<typeof createViewerChannel> | null>(null);
  const externalWinRef = useRef<Window | null>(null);
  const [externalViewerOpen, setExternalViewerOpen] = useState(false);
  // Last broadcasted payload (kept here so we can re-send it when the
  // external viewer asks for the current state on mount).
  const lastPayloadRef = useRef<{ src: string | null; name?: string }>({ src: null });

  // Init channel + answer state requests from the popup
  useEffect(() => {
    const ch = createViewerChannel();
    channelRef.current = ch;
    const unsub = ch.subscribe((msg) => {
      if (msg.type === "request-state") {
        ch.post({ type: "image", ...lastPayloadRef.current });
      }
    });
    return () => {
      unsub();
      ch.close();
    };
  }, []);

  // Poll external window state
  useEffect(() => {
    const t = setInterval(() => {
      const w = externalWinRef.current;
      const open = !!(w && !w.closed);
      setExternalViewerOpen((prev) => (prev !== open ? open : prev));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Restore current image id pointer (metadata only — files don't persist)
  useEffect(() => {
    const cur = loadJSON<string | null>(STORAGE_KEYS.currentImage, null);
    if (cur) setCurrentImageId(cur);
    const meta = loadJSON<ImageMeta[]>(STORAGE_KEYS.imagesMeta, []);
    if (meta.length) {
      setStatus(`Biblioteca previa: ${meta.length} imágenes. Reimporta los archivos para previsualizar.`);
    }
  }, []);

  useEffect(() => {
    saveJSON<string | null>(STORAGE_KEYS.currentImage, currentImageId);
  }, [currentImageId]);

  // Persist metadata only
  useEffect(() => {
    const meta: ImageMeta[] = images.map((i) => ({
      id: i.id,
      name: i.name,
      folder: i.folder,
      size: i.size,
      type: i.type,
      lastModified: i.lastModified,
    }));
    saveJSON(STORAGE_KEYS.imagesMeta, meta);
  }, [images]);

  // Cross-tab sync: when current image changes, broadcast it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.currentImage) {
        try {
          const v = e.newValue ? JSON.parse(e.newValue) : null;
          setCurrentImageId(v);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current.clear();
    };
  }, []);

  const addFiles = useCallback(async (filesIn: FileList | File[]) => {
    const arr = Array.from(filesIn).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) {
      setStatus("No se encontraron imágenes válidas.");
      return;
    }
    setStatus(`Importando ${arr.length} imágenes...`);
    // Process in batches to keep UI responsive
    const batches: File[][] = [];
    for (let i = 0; i < arr.length; i += BATCH) batches.push(arr.slice(i, i + BATCH));

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const newItems: ImageItem[] = batch.map((f) => {
        const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
        const url = URL.createObjectURL(f);
        objectUrls.current.add(url);
        const id = makeId();
        filesById.current.set(id, f);
        return {
          id,
          name: f.name,
          folder: folderFromPath(path, f.name),
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
          url,
        };
      });
      setImages((prev) => [...prev, ...newItems]);
      // Yield between batches
      await new Promise((r) => setTimeout(r, 0));
      setStatus(`Importadas ${Math.min((b + 1) * BATCH, arr.length)} / ${arr.length}`);
    }
    setStatus(`Listo: ${arr.length} imágenes añadidas.`);
  }, []);

  const clearAll = useCallback(() => {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current.clear();
    setImages([]);
    setCurrentImageId(null);
    setSelectedFolder(null);
    setStatus("Biblioteca limpiada.");
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) {
        URL.revokeObjectURL(found.url);
        objectUrls.current.delete(found.url);
      }
      return prev.filter((i) => i.id !== id);
    });
    setCurrentImageId((cur) => (cur === id ? null : cur));
  }, []);

  const folders = useMemo(() => {
    const set = new Set<string>();
    images.forEach((i) => set.add(i.folder));
    return Array.from(set).sort();
  }, [images]);

  // Broadcast current image to external viewer window (as dataURL so it
  // travels across windows; object URLs are document-scoped).
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    if (!currentImageId) {
      lastPayloadRef.current = { src: null };
      ch.post({ type: "image", src: null });
      return;
    }
    const file = filesById.current.get(currentImageId);
    const img = images.find((i) => i.id === currentImageId);
    if (!file) {
      // Cannot broadcast (probably restored from previous session without files)
      lastPayloadRef.current = { src: null, name: img?.name };
      ch.post({ type: "image", src: null, name: img?.name });
      return;
    }
    let cancelled = false;
    fileToDataURL(file).then((dataUrl) => {
      if (cancelled) return;
      lastPayloadRef.current = { src: dataUrl, name: img?.name };
      ch.post({ type: "image", src: dataUrl, name: img?.name });
    });
    return () => {
      cancelled = true;
    };
  }, [currentImageId, images]);

  const openExternalViewer = useCallback(() => {
    const existing = externalWinRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    const features = "popup=yes,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
    const w = window.open("/visor-externo", "dm-external-viewer", features);
    externalWinRef.current = w;
    setExternalViewerOpen(!!w);
  }, []);

  const value: ImagesContextValue = {
    images,
    folders,
    selectedFolder,
    setSelectedFolder,
    currentImageId,
    setCurrentImageId,
    addFiles,
    clearAll,
    removeImage,
    status,
    openExternalViewer,
    externalViewerOpen,
  };

  return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
}

export function useImages() {
  const ctx = useContext(ImagesContext);
  if (!ctx) throw new Error("useImages must be used within ImagesProvider");
  return ctx;
}
