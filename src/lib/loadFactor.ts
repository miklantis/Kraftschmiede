// Anzeige-Seite der vorgegebenen Last. Zwei Wege, die nie an derselben Phase
// haengen: der Lastfaktor je Phase (Journey "Wiederaufbau nach Fasten") und die
// Lastrampe ueber die Phasenwochen (Kraft-, Power- und Testphasen, Issue #200).
// Die Rechenseite liegt in coach.ts/engine; hier entstehen nur die Texte, damit
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
  if (!isNeutralLoad(factor) && factor < 1) {
    return `Vorgegebene Last: ${pct} deines Standes vor der Pause. Der niedrige Vorschlag ist gewollt.`;
  }
  if (isLastPhase) {
    return `Volle Last: ${pct} deines Standes vor der Pause. Danach endet die Vorgabe und der Coach steuert wieder normal.`;
  }
  return `Volle Last: ${pct} deines Standes vor der Pause.`;
}

// ---- Lastrampe der Phase ----------------------------------------------------

// Prozentangabe der geplanten Last ("80 %"), auf eine halbe Stufe gerundet -
// die Rampen der Vorlagen arbeiten in Schritten von 2,5 Prozentpunkten, und
// eine Woche mittendrin landet sonst auf krummen Zahlen.
export function intensityPercent(pct: number): string {
  return String(Math.round(pct * 2) / 2).replace(".", ",") + " %";
}

// Rampe einer Phase als Spanne ("77,5 → 82,5 %"), fuer die Phasenliste. Bei
// gleichem Start- und Endwert nur die eine Zahl.
export function intensityRange(
  start: number | null | undefined,
  end: number | null | undefined,
): string | null {
  if (start == null || end == null) return null;
  if (Math.abs(start - end) < 1e-9) return intensityPercent(start);
  return `${intensityPercent(start)} \u2192 ${intensityPercent(end)}`;
}

// Hinweistext zur laufenden Woche einer lastgesteuerten Phase. Er sagt, was die
// Phase fordert und wer darueber hinaus entscheidet.
//
// In den Aufbauwochen ist die geplante Last nur eine Untergrenze (ADR-0016,
// Nachtrag): der Coach darf darueber steigern, und bei alltaeglichen Lasten tut
// er das auch. Der Text muss das sagen - sonst behauptet er eine Vorgabe, die
// die Gewichte daneben widerlegen.
//
// `isDeload` kehrt das um: dort deckelt die Rampe wirklich, und der Rueckgang
// ist gewollt und keine Schwaeche.
export function intensityNote(
  pct: number | null | undefined,
  isDeload: boolean,
): string | null {
  if (pct == null) return null;
  const wert = intensityPercent(pct);
  if (isDeload) {
    return `Entlastungswoche: ${wert} deines Maximums. Die leichte Last ist gewollt - naechste Woche geht es wieder hoch.`;
  }
  return `Geplante Mindestlast dieser Woche: ${wert} deines Maximums. Schaffst du mehr, steigert der Coach normal weiter.`;
}

// Hinweis fuer eine Uebung, die von der Lastrampe ausgenommen bleibt, weil kein
// getestetes Maximum vorliegt. Ohne diesen Satz wirkt es wie ein Fehler, dass
// eine einzelne Uebung der Vorgabe nicht folgt.
export function intensityMissingRmNote(): string {
  return "Fuer diese Uebung fehlt ein 1RM-Test - hier steuert der Coach das Gewicht wie gewohnt.";
}
