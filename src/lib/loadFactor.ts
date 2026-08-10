// Anzeige-Seite des Lastfaktors (Journey "Wiederaufbau nach Fasten"). Die
// Rechenseite liegt in coach.ts/engine; hier entstehen nur die Texte, damit
// Journey-Seite, Periodisierungskurve und Trainingsbildschirm dieselbe Sprache
// sprechen. Reine Funktionen ohne DB-/DOM-Bezug.

// Ein Lastfaktor gilt als neutral, wenn er (praktisch) 1.0 ist: dann verhaelt
// sich die Phase wie jede andere und wird nirgends besonders ausgewiesen.
export function isNeutralLoad(factor: number | null | undefined): boolean {
  if (factor == null) return true;
  return Math.abs(factor - 1) <= 1e-9;
}

// Arbeitet die Journey ueberhaupt mit Lastfaktoren? Nur dann sind die Hinweise
// und die zusaetzliche Detailzeile ueberhaupt sinnvoll.
export function usesLoadFactor(
  factors: ReadonlyArray<number | null | undefined>,
): boolean {
  return factors.some((f) => !isNeutralLoad(f));
}

// Lastfaktor als Prozentangabe ("65 %"), kaufmaennisch gerundet.
export function loadPercent(factor: number): string {
  return Math.round(factor * 100) + " %";
}

// Kurzer Hinweistext zur laufenden Phase. null, wenn die Journey ohne
// Lastfaktoren arbeitet. Unter 100 % erklaert er den bewusst niedrigen
// Vorschlag; bei 100 % in der letzten Phase, dass die Vorgabe endet.
export function loadFactorNote(
  factor: number | null | undefined,
  isLastPhase: boolean,
): string | null {
  if (factor == null) return null;
  const pct = loadPercent(factor);
  if (factor < 1 - 1e-9) {
    return `Vorgegebene Last: ${pct} deines Standes vor der Pause. Der niedrige Vorschlag ist gewollt.`;
  }
  if (isLastPhase) {
    return `Volle Last: ${pct} deines Standes vor der Pause. Danach endet die Vorgabe und der Coach steuert wieder normal.`;
  }
  return `Volle Last: ${pct} deines Standes vor der Pause.`;
}
