import { Pause, Play, Square, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMusic, type ActivePlayer } from "@/contexts/MusicContext";

/**
 * Floating multi-layer mini-player. Each active layer hosts its own hidden
 * YouTube IFrame so several tracks can play at once with independent volumes.
 */
export function MiniPlayer({ embedded = false }: { embedded?: boolean } = {}) {
  const {
    activePlayers,
    pauseLayer,
    resumeLayer,
    removeLayer,
    setLayerVolume,
    pauseAll,
    resumeAll,
    stopAll,
    errorMessage,
  } = useMusic();

  const anyPlaying = activePlayers.some((p) => p.state === "playing");

  const containerClass = embedded
    ? "rounded-xl border border-border bg-card/60 p-3"
    : "fixed bottom-4 right-4 z-40 w-96 rounded-xl border border-border bg-card/95 p-3 shadow-elegant backdrop-blur";

  if (!embedded && activePlayers.length === 0 && !errorMessage) {
    return null;
  }

  return (
    <div
      className={containerClass}
      role="region"
      aria-label="Reproductor de música"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-xs uppercase tracking-widest text-gold">
          Capas activas ({activePlayers.length})
        </span>
        <div className="flex items-center gap-1">
          {anyPlaying ? (
            <Button size="sm" variant="ghost" onClick={pauseAll} aria-label="Pausar todo">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={resumeAll} aria-label="Reanudar todo">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={stopAll} aria-label="Detener todo">
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {activePlayers.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Sin capas activas. Pulsa <strong className="text-foreground">Play</strong> o <strong className="text-foreground">Capa</strong> en una pista para empezar.
        </p>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
          {activePlayers.map((p) => (
            <LayerRow key={p.layerId} layer={p} onPause={pauseLayer} onResume={resumeLayer} onRemove={removeLayer} onVolume={setLayerVolume} />
          ))}
        </div>
      )}

      {errorMessage && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function LayerRow({
  layer,
  onPause,
  onResume,
  onRemove,
  onVolume,
}: {
  layer: ActivePlayer;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onVolume: (id: string, v: number) => void;
}) {
  const isPlaying = layer.state === "playing";

  return (
    <div className="rounded-md border border-border bg-background/60 p-2">
      <div className="flex items-center gap-2">
        <img
          src={`https://i.ytimg.com/vi/${layer.ytId}/default.jpg`}
          alt=""
          className="h-8 w-12 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium" title={layer.title}>
            {layer.title}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {layer.state === "loading"
              ? "Cargando…"
              : layer.state === "playing"
                ? "Reproduciendo"
                : layer.state === "paused"
                  ? "En pausa"
                  : "Error"}
          </div>
        </div>
        {isPlaying ? (
          <Button size="icon" variant="ghost" onClick={() => onPause(layer.layerId)} aria-label="Pausar capa">
            <Pause className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" onClick={() => onResume(layer.layerId)} aria-label="Reanudar capa">
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(layer.layerId)}
          aria-label="Quitar capa"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <Slider
          value={[layer.volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => onVolume(layer.layerId, v[0] ?? 0)}
          aria-label={`Volumen de ${layer.title}`}
        />
        <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
          {layer.volume}
        </span>
      </div>
    </div>
  );
}
