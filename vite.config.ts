import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

// Schreibt die aktuelle App-Version aus public/changelog.json bereits beim Build
// in den <title>, sodass das App-Fenster "Kraftschmiede <Version>" zeigt - von
// der ersten Sekunde an und offline, ohne Nachladen. Quelle bleibt einzig die
// changelog.json (newest-first). Der Homescreen-/Installationsname
// (apple-mobile-web-app-title, Manifest) bleibt unberuehrt "Kraftschmiede".
function appTitleVersion(): Plugin {
  return {
    name: "app-title-version",
    transformIndexHtml(html) {
      let version = "";
      try {
        const raw = readFileSync(
          fileURLToPath(new URL("./public/changelog.json", import.meta.url)),
          "utf-8",
        );
        const parsed = JSON.parse(raw) as {
          versions?: { version?: string }[];
        };
        version = parsed.versions?.[0]?.version ?? "";
      } catch {
        version = "";
      }
      const title = version ? `Kraftschmiede ${version}` : "Kraftschmiede";
      return html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    },
  };
}

// base ist auf den Repo-Namen gesetzt, weil die App unter
// https://miklantis.github.io/Kraftschmiede/ ausgeliefert wird (Projekt-Pages).
export default defineConfig({
  base: "/Kraftschmiede/",
  // Reihenfolge wichtig: Router-Plugin vor dem React-Plugin.
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    appTitleVersion(),
    // Offline-Huelle (PWA). Der Service Worker cacht beim ersten Laden die
    // App-Shell (HTML/JS/CSS, Icons, gebuendelte Schriften); danach startet und
    // laeuft die App ohne Netz. Die Daten bleiben Sache der bestehenden
    // TanStack-Schicht (IndexedDB + pausierte Mutationen) - der SW fasst
    // Supabase-Aufrufe nicht an.
    VitePWA({
      // 'prompt': Updates werden nicht still uebernommen. Die sichtbare
      // Update-UI (Hinweis-Streifen + "Aktualisieren") folgt in Lieferung 2;
      // hier cacht die Huelle nur, beim ersten Install ohne Wartezustand.
      registerType: "prompt",
      // Manuelle Registrierung ueber das App-eigene Update-Modul
      // (src/lib/pwaUpdate.ts), damit das "neue Version wartet"-Signal in die UI
      // gelangt. Kein automatisch eingehaengtes Registrierungs-Skript.
      injectRegister: false,
      // Das bestehende public/site.webmanifest (V1-Paritaet) bleibt unberuehrt;
      // das Plugin erzeugt KEIN eigenes Manifest und ueberschreibt nichts.
      manifest: false,
      workbox: {
        // App-Shell: alle Build-Dateien plus Icons und gebuendelte Schriften.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Grosse JS-Buendel nicht aus dem Precache fallen lassen, sonst startet
        // die App offline nicht vollstaendig.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Deep-Links offline: Navigationsanfragen liefern die gecachte App-Huelle
        // unter der base aus. Koexistiert mit dem dist/404.html-Fallback der
        // GitHub-Pages-Auslieferung (greift nur online).
        navigateFallback: "/Kraftschmiede/index.html",
        // Veraltete Precaches beim Aktivieren einer neuen Huelle aufraeumen.
        cleanupOutdatedCaches: true,
        // Bewusst KEINE runtimeCaching-Regel: Supabase-Aufrufe (Daten) gehen
        // unveraendert ins Netz. Offline kommen die Daten aus der bestehenden
        // TanStack-Persistenz, damit sich die zwei Offline-Mechanismen nicht in
        // die Quere kommen.
      },
      // Service Worker nur im Build, nicht im Dev-Server.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
