import { registerSW } from "virtual:pwa-register";

// Kapselt die Service-Worker-Registrierung und das "eine neue Huelle wartet"-
// Signal. Bewusst auf Modul-Ebene (ausserhalb von React): die Registrierung
// passiert einmalig beim App-Start, unabhaengig von der Route. Die UI liest das
// Signal ueber useSyncExternalStore (siehe useAppUpdate) und kennt die
// SW-Technik dadurch nicht direkt - gleiche Kapselung wie bei den Datenzugriffen.
// Kein DOM-Bezug.

let updateAvailable = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let started = false;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

// Abonniert Aenderungen am Wartesignal (fuer useSyncExternalStore).
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Aktueller Stand: wartet eine neue Huelle? (fuer useSyncExternalStore)
export function getSnapshot(): boolean {
  return updateAvailable;
}

// Uebernimmt die wartende Version: aktiviert den neuen Service Worker und laedt
// die App einmal neu. Ohne wartende Version ein No-op.
export function applyUpdate(): void {
  if (updateSW !== null) {
    void updateSW(true);
  }
}

// Einmalige Registrierung beim App-Start. registerType ist 'prompt': eine neue
// Huelle wird nur geladen und meldet sich ueber onNeedRefresh, nicht still
// aktiviert. Es wird bewusst KEIN periodisches Pruef-Intervall gesetzt - die
// Pruefung passiert bei der Registrierung (App-Start), so gewuenscht.
export function initPwaUpdate(): void {
  if (started) return;
  started = true;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true;
      emit();
    },
  });
}

// Notbremse: deregistriert alle Service Worker und leert die zwischengespeicherte
// App-Huelle (Cache Storage), danach laedt die App frisch aus dem Netz. Fuer den
// seltenen Fall, dass ein Update nicht ankommt und die App auf einem alten Stand
// haengt. Beruehrt NICHT die Nutzerdaten: die liegen in IndexedDB (TanStack-
// Persistenz) und werden hier nicht angefasst.
export async function resetServiceWorker(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
}
