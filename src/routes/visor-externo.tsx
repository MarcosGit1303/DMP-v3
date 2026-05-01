import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createViewerChannel } from "@/lib/viewer-channel";

export const Route = createFileRoute("/visor-externo")({
  head: () => ({
    meta: [
      { title: "Visor externo — Pantalla DM" },
      { name: "description", content: "Pantalla externa para mostrar imágenes a los jugadores." },
    ],
  }),
  component: ExternalViewerPage,
});

function ExternalViewerPage() {
  const [src, setSrc] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const ch = createViewerChannel();
    const unsub = ch.subscribe((msg) => {
      if (msg.type === "image") {
        setSrc(msg.src);
        setName(msg.name ?? "");
      }
    });
    // Ask the opener for the current state (the popup mounts AFTER the
    // last broadcast, so without this it would stay blank).
    ch.post({ type: "request-state" });
    // Also try the storage fallback (last persisted payload).
    try {
      const raw = window.localStorage.getItem("dm.images.current.v1.payload");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.type === "image" && parsed?.src) {
          setSrc(parsed.src);
          setName(parsed.name ?? "");
        }
      }
    } catch {
      /* ignore */
    }
    return () => {
      unsub();
      ch.close();
    };
  }, []);

  return (
    <div
      className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
      aria-live="polite"
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="max-h-screen max-w-full object-contain"
        />
      ) : (
        <div className="text-center text-neutral-500">
          <p className="font-display text-2xl text-amber-400">Pantalla lista</p>
          <p className="mt-2 text-sm">Selecciona una imagen en la Pantalla DM.</p>
        </div>
      )}
    </div>
  );
}
