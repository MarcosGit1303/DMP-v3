import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ImagesProvider } from "@/contexts/ImagesContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { CombatProvider } from "@/contexts/CombatContext";
import { Toaster } from "@/components/ui/sonner";
import { MusicHosts } from "@/components/MusicHosts";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-gold">404</h1>
        <h2 className="mt-4 font-display text-xl">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sala del calabozo no existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pantalla DM — Centro de control para Dungeon Masters" },
      {
        name: "description",
        content:
          "Centraliza imágenes para jugadores y música ambiental de YouTube en una sola pantalla.",
      },
      { property: "og:title", content: "Pantalla DM — Centro de control para Dungeon Masters" },
      {
        property: "og:description",
        content: "Imágenes, música y visor de mesa en tiempo real para tus partidas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Pantalla DM — Centro de control para Dungeon Masters" },
      { name: "description", content: "DM's Stage centralizes game assets and controls for Dungeon Masters, streamlining session management and player engagement." },
      { property: "og:description", content: "DM's Stage centralizes game assets and controls for Dungeon Masters, streamlining session management and player engagement." },
      { name: "twitter:description", content: "DM's Stage centralizes game assets and controls for Dungeon Masters, streamlining session management and player engagement." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/94f76843-fe91-4a07-a253-12e3c991a73b/id-preview-3a4f7bfa--a1568525-6a39-4ae8-b0b7-5863f6f5d2ef.lovable.app-1777632711163.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/94f76843-fe91-4a07-a253-12e3c991a73b/id-preview-3a4f7bfa--a1568525-6a39-4ae8-b0b7-5863f6f5d2ef.lovable.app-1777632711163.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isExternal = pathname === "/visor-externo";

  if (isExternal) {
    // Bare layout for the popup window — no sidebar, header, or providers
    // beyond what the route itself needs (the channel handles sync).
    return <Outlet />;
  }

  return (
    <ImagesProvider>
      <MusicProvider>
        <CombatProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
                  <SidebarTrigger />
                  <div className="rune-divider hidden h-px flex-1 sm:block" />
                  <span className="font-display text-sm uppercase tracking-widest text-gold">
                    Pantalla DM
                  </span>
                </header>
                <main className="flex-1">
                  <Outlet />
                </main>
              </div>
            </div>
            <MusicHosts />
            <Toaster />
          </SidebarProvider>
        </CombatProvider>
      </MusicProvider>
    </ImagesProvider>
  );
}
