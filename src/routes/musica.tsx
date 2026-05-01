import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Layers,
  Music as MusicIcon,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMusic } from "@/contexts/MusicContext";
import { MiniPlayer } from "@/components/MiniPlayer";
import { toast } from "sonner";

export const Route = createFileRoute("/musica")({
  head: () => ({
    meta: [
      { title: "Música — Pantalla DM" },
      {
        name: "description",
        content:
          "Gestiona pistas de YouTube y crea ambientes con varias capas simultáneas.",
      },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const {
    tracks,
    groups,
    activePlayers,
    addTrack,
    removeTrack,
    playSolo,
    addLayer,
    createGroup,
    deleteGroup,
    addToGroup,
    removeFromGroup,
    playGroup,
  } = useMusic();

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addTrack(url, name || undefined);
    if (!res.ok) {
      toast.error(res.error ?? "Error al añadir");
      return;
    }
    setUrl("");
    setName("");
    toast.success("Pista añadida");
  };

  const onCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    createGroup(groupName);
    setGroupName("");
    toast.success("Grupo creado");
  };

  const isActive = (trackId: string) =>
    activePlayers.some((p) => p.trackId === trackId);

  return (
    <div className="px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-gold">Música ambiental</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reproduce varias pistas a la vez (música + sonido ambiente) con volúmenes independientes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add + tracks */}
        <section className="lg:col-span-2">
          <form
            onSubmit={onAdd}
            className="mb-4 grid gap-2 rounded-xl border border-border bg-card/60 p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <Input
              placeholder="URL de YouTube (youtube.com/watch?v=… o youtu.be/…)"
              value={url}
              onChange={(e) => setUrl(e.target.value.slice(0, 500))}
              required
              aria-label="URL de YouTube"
            />
            <Input
              placeholder="Nombre personalizado (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              aria-label="Nombre"
            />
            <Button type="submit" className="bg-gradient-gold text-gold-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> Añadir
            </Button>
          </form>

          <div className="rounded-xl border border-border bg-card/60">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-sm uppercase tracking-widest text-gold">
                Pistas ({tracks.length})
              </h2>
            </div>
            {tracks.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <MusicIcon className="mx-auto mb-2 h-8 w-8" />
                Aún no hay pistas. Añade tu primera URL de YouTube.
              </div>
            ) : (
              <ScrollArea className="h-[55vh]">
                <ul role="list" className="divide-y divide-border">
                  {tracks.map((t) => {
                    const active = isActive(t.id);
                    return (
                      <li
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-2.5 ${
                          active ? "bg-gold/5" : ""
                        }`}
                      >
                        <img
                          src={`https://i.ytimg.com/vi/${t.ytId}/default.jpg`}
                          alt=""
                          className="h-10 w-16 rounded object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium" title={t.title}>
                              {t.title}
                            </span>
                            {active && (
                              <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-gold-foreground">
                                Sonando
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {t.ytId}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              playSolo(t.id);
                              toast("Reproduciendo en solitario");
                            }}
                            aria-label={`Reproducir ${t.title} solo`}
                            title="Reproducir solo (detiene las demás)"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              addLayer(t.id);
                              toast.success("Añadida como capa simultánea");
                            }}
                            aria-label="Añadir como capa"
                            title="Añadir capa (suena en paralelo)"
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                          <AddToGroupSelect
                            groups={groups}
                            onPick={(gId) => {
                              addToGroup(gId, t.id);
                              toast.success("Añadida al grupo");
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTrack(t.id)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </div>
        </section>

        {/* Groups + active layers */}
        <aside className="space-y-6">
          <MiniPlayer embedded />

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="mb-2 font-display text-sm uppercase tracking-widest text-gold">
              ¿Cómo funciona?
            </h2>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>· <strong className="text-foreground">Play</strong>: detiene las demás capas y reproduce solo esa pista.</li>
              <li>· <strong className="text-foreground">Capa</strong>: añade la pista en paralelo a lo que ya esté sonando.</li>
              <li>· <strong className="text-foreground">Grupo</strong>: reproduce todas sus pistas a la vez (ideal para música + ambiente).</li>
              <li>· Cada capa tiene su propio volumen aquí arriba.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card/60">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-sm uppercase tracking-widest text-gold">
                Grupos / ambientes ({groups.length})
              </h2>
            </div>
            <form onSubmit={onCreateGroup} className="flex gap-2 p-3">
              <Input
                placeholder="Nuevo ambiente (Combate, Taberna…)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value.slice(0, 50))}
              />
              <Button type="submit" size="icon" variant="outline" aria-label="Crear grupo">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            <ul className="space-y-2 p-3 pt-0">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="rounded-lg border border-border bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {g.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {g.trackIds.length} pista{g.trackIds.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          playGroup(g.id);
                          toast.success(`Ambiente "${g.name}" iniciado`);
                        }}
                        disabled={!g.trackIds.length}
                        aria-label="Reproducir ambiente (todas las pistas a la vez)"
                        title="Reproducir todas las pistas a la vez"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteGroup(g.id)}
                        aria-label="Eliminar grupo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {g.trackIds.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {g.trackIds.map((tid) => {
                        const t = tracks.find((x) => x.id === tid);
                        if (!t) return null;
                        return (
                          <li
                            key={tid}
                            className="flex items-center justify-between text-xs text-muted-foreground"
                          >
                            <span className="truncate">· {t.title}</span>
                            <button
                              onClick={() => removeFromGroup(g.id, tid)}
                              className="ml-2 rounded p-0.5 hover:bg-destructive/20"
                              aria-label="Quitar del grupo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
              {groups.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Crea ambientes que mezclen varias pistas (música + lluvia + fuego…).
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AddToGroupSelect({
  groups,
  onPick,
}: {
  groups: { id: string; name: string }[];
  onPick: (id: string) => void;
}) {
  if (!groups.length) return null;
  return (
    <Select onValueChange={onPick}>
      <SelectTrigger className="h-8 w-8 border-0 bg-transparent p-0 [&>svg]:hidden" aria-label="Añadir a grupo">
        <span className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
          <Plus className="h-4 w-4" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
