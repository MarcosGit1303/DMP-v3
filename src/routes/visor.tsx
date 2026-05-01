import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Monitor, MonitorCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImages } from "@/contexts/ImagesContext";

export const Route = createFileRoute("/visor")({
  head: () => ({
    meta: [
      { title: "Visor — Pantalla DM" },
      { name: "description", content: "Controla la pantalla externa para los jugadores." },
    ],
  }),
  component: ViewerControlPage,
});

function ViewerControlPage() {
  const { images, currentImageId, openExternalViewer, externalViewerOpen } = useImages();
  const current = images.find((i) => i.id === currentImageId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-1 text-xs uppercase tracking-widest text-gold">
          <Monitor className="h-3 w-3" /> Pantalla externa
        </div>
        <h1 className="font-display text-3xl text-foreground">Visor para jugadores</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Abre una ventana independiente y arrástrala a tu segunda pantalla. La imagen
          que selecciones aquí se mostrará allí en tiempo real.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            {externalViewerOpen ? (
              <MonitorCheck className="h-8 w-8 text-gold" />
            ) : (
              <Monitor className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <div className="font-display text-lg">
                {externalViewerOpen ? "Pantalla externa abierta" : "Pantalla externa cerrada"}
              </div>
              <div className="text-xs text-muted-foreground">
                {externalViewerOpen
                  ? "Muévela a tu segundo monitor y ponla a pantalla completa (F11)."
                  : "Pulsa el botón para abrir una ventana independiente."}
              </div>
            </div>
          </div>
          <Button
            onClick={openExternalViewer}
            className="bg-gradient-gold text-gold-foreground hover:opacity-90"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {externalViewerOpen ? "Reenfocar ventana" : "Abrir pantalla externa"}
          </Button>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Mostrando ahora
          </div>
          {current ? (
            <div className="flex items-center gap-3">
              <img
                src={current.url}
                alt={current.name}
                className="h-20 w-32 rounded object-cover"
              />
              <div className="min-w-0">
                <div className="truncate font-medium">{current.name}</div>
                <div className="text-xs text-muted-foreground">{current.folder}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay imagen seleccionada. Ve a Imágenes y elige una.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Consejo:</strong> tu navegador puede pedirte permiso
        para abrir ventanas emergentes la primera vez. Acepta para que el visor se abra como
        ventana independiente y no como pestaña.
      </div>
    </div>
  );
}
