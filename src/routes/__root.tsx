import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

import appCss from "../styles.css?url";
import { Sidebar, BottomNav } from "@/components/app-shell";
import { Suspense, lazy } from "react";

const NovoOrcamentoModal = lazy(() => import("./index").then(m => ({ default: m.NovoOrcamentoModal })));

function ThemeHandler() {
  const config = useLiveQuery(() => db.config.get(1));
  
  useEffect(() => {
    if (config?.tema) {
      document.documentElement.setAttribute("data-theme", config.tema);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [config?.tema]);

  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
      <div className="max-w-md text-center brutal-border bg-surface p-8 brutal-shadow-brand">
        <div className="text-mono text-brand text-xs uppercase tracking-widest mb-2">
          {"> ERR_NOT_FOUND"}
        </div>
        <h1 className="text-display text-7xl">404</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Esta página não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-block bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-5 py-3 text-xs font-black uppercase tracking-widest"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
      <div className="max-w-md text-center brutal-border bg-surface p-8 brutal-shadow">
        <div className="text-mono text-destructive text-xs uppercase tracking-widest mb-2">
          {"> ERR_RUNTIME"}
        </div>
        <h1 className="text-display text-2xl mb-2">Algo quebrou</h1>
        <p className="text-foreground/60 text-sm mb-6">{error.message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-2 text-xs font-black uppercase tracking-widest"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="bg-surface text-foreground brutal-border-thin brutal-press px-4 py-2 text-xs font-black uppercase tracking-widest"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#020617" },
      { title: "Pintor Plus — Orçamentos no canteiro de obra" },
      {
        name: "description",
        content:
          "App offline para pintores: orçamentos, clientes, agenda, recibo, PDF e WhatsApp em segundos.",
      },
      { property: "og:title", content: "Pintor Plus — Orçamentos no canteiro de obra" },
      {
        property: "og:description",
        content: "Orçamentos, clientes, agenda e recibo no bolso do pintor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Pintor Plus — Orçamentos no canteiro de obra" },
      { name: "description", content: "Obras Rápido is a mobile app for painters to manage clients, quotes, and projects offline." },
      { property: "og:description", content: "Obras Rápido is a mobile app for painters to manage clients, quotes, and projects offline." },
      { name: "twitter:description", content: "Obras Rápido is a mobile app for painters to manage clients, quotes, and projects offline." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/nveml7lPo8TvYZvy2z2QdfH1iqC2/social-images/social-1778968314189-web-app-manifest-512x512.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/nveml7lPo8TvYZvy2z2QdfH1iqC2/social-images/social-1778968314189-web-app-manifest-512x512.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
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
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen text-foreground transition-colors duration-500">
        <ThemeHandler />
        <Sidebar />
        <main className="flex-1 min-w-0 pb-24 md:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </QueryClientProvider>
  );
}
