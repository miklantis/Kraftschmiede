import { useState } from "react";

// Schrittweise sichtbare Liste ("Mehr laden"): zeigt zunaechst `seitengroesse`
// Eintraege und gibt jeweils so viele weitere frei. Reine Anzeige-Logik – die
// Daten liegen vollstaendig vor, es wird nichts nachgeladen.
//
// Genutzt im Verlauf (letzte Einheiten), im Befinden-Verlauf, bei den Messungen
// und den Zeitraeumen. Zusammen mit dem Knopf MehrLadenButton.
export const MEHR_LADEN_SEITE = 5;

export interface MehrLaden<T> {
  /** Der aktuell sichtbare Ausschnitt der Liste. */
  sichtbar: T[];
  /** Gibt es noch verdeckte Eintraege? */
  hatMehr: boolean;
  /** Legt die naechste Seite frei. */
  mehrLaden: () => void;
}

// Reine Rechnung hinter dem Hook: Ausschnitt und Rest-Flag zu einer Anzahl.
export function mehrLadenAnsicht<T>(
  items: readonly T[],
  anzahl: number,
): { sichtbar: T[]; hatMehr: boolean } {
  const grenze = Math.max(0, anzahl);
  return { sichtbar: items.slice(0, grenze), hatMehr: items.length > grenze };
}

export function useMehrLaden<T>(
  items: readonly T[],
  seitengroesse: number = MEHR_LADEN_SEITE,
): MehrLaden<T> {
  const [anzahl, setAnzahl] = useState(seitengroesse);
  return {
    ...mehrLadenAnsicht(items, anzahl),
    mehrLaden: () => setAnzahl((n) => n + seitengroesse),
  };
}
