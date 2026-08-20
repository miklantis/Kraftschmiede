// Winziger geraete-lokaler Store fuer die Abschluss-Meldung einer Journey.
// Gleiche Bauform wie der Live-Store (useSyncExternalStore, kein TanStack-Query):
// der Abschluss ueber den Kalender (useJourneyCompletion) setzt hier nach
// erfolgreichem Archivieren den Namen der durchlaufenen Journey, die global
// gemountete Live-Schicht zeigt daraufhin das Popup. Bewusst fluechtig - die
// Meldung gehoert zum Moment des Abschlusses, nicht in den Speicher.

let doneName: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Meldung anstossen: die genannte Journey ist durchlaufen und archiviert. */
export function notifyJourneyDone(name: string): void {
  doneName = name;
  emit();
}

/** Meldung wegraeumen (Popup geschlossen). */
export function clearJourneyDone(): void {
  if (doneName === null) return;
  doneName = null;
  emit();
}

export function subscribeJourneyDone(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getJourneyDone(): string | null {
  return doneName;
}
