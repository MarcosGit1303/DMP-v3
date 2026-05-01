import { useEffect, useRef } from "react";
import { useMusic } from "@/contexts/MusicContext";

/**
 * Renders persistent off-screen hosts for every active YouTube layer.
 * Mounted once at the app root so playback survives route changes.
 */
export function MusicHosts() {
  const { activePlayers } = useMusic();
  return (
    <div aria-hidden="true">
      {activePlayers.map((p) => (
        <Host key={p.layerId} layerId={p.layerId} />
      ))}
    </div>
  );
}

function Host({ layerId }: { layerId: string }) {
  const { registerSlotEl } = useMusic();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    registerSlotEl(layerId, ref.current);
    return () => registerSlotEl(layerId, null);
  }, [layerId, registerSlotEl]);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: 200,
        height: 120,
        pointerEvents: "none",
      }}
    />
  );
}
