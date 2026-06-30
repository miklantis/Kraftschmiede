import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/queryClient";
import {
  offlinePersister,
  CACHE_BUSTER,
  CACHE_MAX_ALTER_MS,
} from "@/lib/offline";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/AuthGate";
import { initPwaUpdate } from "@/lib/pwaUpdate";
import "@fontsource-variable/spline-sans-mono/wght.css";
import "./index.css";

// Service Worker beim App-Start registrieren (Offline-Huelle, Lieferung 1) und
// das Wartesignal fuer den Update-Hinweis aktivieren (Lieferung 2). Einmalig,
// routen-unabhaengig.
initPwaUpdate();

// Router aus dem generierten Routenbaum. basepath folgt dem Vite-base,
// damit Routing lokal (/) und auf GitHub Pages (/Kraftschmiede/) gleich funktioniert.
const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: "intent",
});

// Typsicherheit fuer den Router (Links, Params) projektweit.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root-Element #root nicht gefunden.");
}

createRoot(rootElement).render(
  <StrictMode>
    {/* Persistenter Provider: Cache liegt in IndexedDB und ueberlebt das
        Schliessen der App. Nach dem Wiederherstellen werden ohne Netz
        angefallene, pausierte Schreibvorgaenge fortgesetzt. */}
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: offlinePersister,
        maxAge: CACHE_MAX_ALTER_MS,
        buster: CACHE_BUSTER,
      }}
      onSuccess={() => {
        void queryClient.resumePausedMutations();
      }}
    >
      {/* AuthProvider haelt die Sitzung; AuthGate laesst die App erst nach
          Anmeldung durch, da alle Schreibzugriffe RLS-geschuetzt sind. */}
      <AuthProvider>
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
