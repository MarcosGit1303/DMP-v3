import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FolderOpen, Image as ImageIcon, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useImages } from "@/contexts/ImagesContext";
import { toast } from "sonner";

export const Route = createFileRoute("/imagenes")({
  head: () => ({
    meta: [
      { title: "Imágenes — Pantalla DM" },
      { name: "description", content: "Importa, organiza y proyecta imágenes para tus jugadores." },
    ],
  }),
  component: ImagesPage,
});

const PAGE_SIZE = 60;

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function ImagesPage() {
  const {
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
  } = useImages();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return images.filter((i) => {
      if (selectedFolder && i.folder !== selectedFolder) return false;
      if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [images, selectedFolder, query]);

  useEffect(() => setPage(1), [selectedFolder, query]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;


  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold">Biblioteca de imágenes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {images.length} imágenes · {folders.length} carpetas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                addFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            // @ts-expect-error non-standard but widely supported
            webkitdirectory=""
            directory=""
            onChange={(e) => {
              if (e.target.files) {
                addFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            <ImageIcon className="mr-2 h-4 w-4" /> Añadir imágenes
          </Button>
          <Button onClick={() => folderInputRef.current?.click()} variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" /> Importar carpeta
          </Button>
          <Button onClick={openExternalViewer} className="bg-gradient-gold text-gold-foreground hover:opacity-90">
            <ExternalLink className="mr-2 h-4 w-4" />
            {externalViewerOpen ? "Reenfocar pantalla externa" : "Abrir pantalla externa"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("¿Limpiar toda la biblioteca?")) {
                clearAll();
                toast.success("Biblioteca limpiada");
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Limpiar
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {status}
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Folders panel */}
        <aside className="rounded-xl border border-border bg-card/60 p-3">
          <div className="mb-2 font-display text-xs uppercase tracking-widest text-gold">
            Carpetas
          </div>
          <ScrollArea className="h-[60vh]">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
                selectedFolder === null ? "bg-gold/15 text-gold" : "hover:bg-accent"
              }`}
            >
              Todas ({images.length})
            </button>
            {folders.map((f) => {
              const count = images.filter((i) => i.folder === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFolder(f)}
                  className={`mb-1 block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition ${
                    selectedFolder === f ? "bg-gold/15 text-gold" : "hover:bg-accent"
                  }`}
                  title={f}
                >
                  {f} ({count})
                </button>
              );
            })}
          </ScrollArea>
        </aside>

        {/* Grid */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Input
              placeholder="Buscar por nombre..."
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 100))}
              className="max-w-sm"
              aria-label="Buscar imágenes"
            />
            <span className="text-xs text-muted-foreground">
              {filtered.length} resultados
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-display text-lg">Sin imágenes todavía</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importa archivos o una carpeta entera para empezar.
              </p>
            </div>
          ) : (
            <>
              <ul
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                role="list"
              >
                {visible.map((img) => {
                  const isCurrent = img.id === currentImageId;
                  return (
                    <li key={img.id} className="group relative">
                      <button
                        onClick={() => setCurrentImageId(img.id)}
                        className={`block w-full overflow-hidden rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isCurrent
                            ? "border-gold shadow-glow"
                            : "border-border hover:border-gold/60"
                        }`}
                        aria-label={`Mostrar ${img.name} a los jugadores`}
                        aria-pressed={isCurrent}
                      >
                        <div className="aspect-square w-full overflow-hidden bg-black/40">
                          <img
                            src={img.url}
                            alt={img.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        </div>
                        <div className="px-2 py-1.5 text-left">
                          <div className="truncate text-xs font-medium" title={img.name}>
                            {img.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatSize(img.size)}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute right-1 top-1 rounded-md bg-background/70 p-1 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label={`Eliminar ${img.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {isCurrent && (
                        <span className="absolute left-1 top-1 rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
                          En visor
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Cargar más ({filtered.length - visible.length} restantes)
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
