// Anzeige-Seite der Lastvorgabe einer Phase. Die Rechenseite liegt in
// coach.ts/engine; hier entstehen nur die Texte, damit Journey-Seite,
// Vorlagen-Vorschau, Periodisierungskurve, Rueckblick, Coach-Export und
// Trainingsbildschirm dieselbe Sprache sprechen. Reine Funktionen ohne
// DB-/DOM-Bezug.
//
// Seit Schritt 4 des Vorhabens "Bausteine in der Datenbank" traegt die Phase
// ihre Last als Liste (engine/loadPlan.ts) statt als einzelnen Faktor: je
// Phasenwoche ein Anteil. Die laufende Phase zeigt den Anteil ihrer laufenden
// Woche, alle anderen Ansichten die Spanne ("65 → 95 %").

import { hasLoadPlan, loadPlanSpan, type LoadPlan } from "@/engine/loadPlan";

// Ein Lastanteil gilt als neutral, wenn er (praktisch) 1.0 ist: dann verhaelt
// sich die Woche wie jede andere und wird nicht besonders gedeckelt.
export function isNeutralLoad(factor: number | null | undefined): boolean {
  if (factor == null) return true;
  return Math.abs(factor - 1) <= 1e-9;
}

// Arbeitet die Journey (oder die Vorlage) ueberhaupt mit einer Lastvorgabe? Nur
// dann sind die Hinweise, die zusaetzliche Detailzeile und das Einfrieren der
// Referenzgewichte ueberhaupt sinnvoll. Eine Liste ist die Vorgabe - auch eine
// mit lauter gleichen Zeilen; "keine Vorgabe" ist die fehlende Liste.
export function usesLoadPlan(
  plans: ReadonlyArray<LoadPlan | null | undefined>,
): boolean {
  return plans.some(hasLoadPlan);
}

// Lastanteil als Prozentangabe ("65 %"), kaufmaennisch gerundet.
export function loadPercent(factor: number): string {
  return Math.round(factor * 100) + " %";
}

// Spanne einer Lastliste als Beschriftung: "65 → 95 %" bei wanderndem Block,
// "80 %" bei gleichbleibender Last. null ohne Liste.
//
// Sie steht ueberall dort, wo es keine laufende Woche gibt, deren Anteil man
// zeigen koennte: an nicht laufenden Phasen, in der Vorlagen-Vorschau, im
// Rueckblick und im Coach-Export. "65 %" waere fuer eine kuenftige Phase, die
// von 65 auf 95 wandert, schlicht falsch.
export function loadSpanLabel(plan: LoadPlan | null | undefined): string | null {
  const span = loadPlanSpan(plan);
  if (span === null) return null;
  const [start, end] = span;
  return start === end
    ? loadPercent(start)
    : `${Math.round(start * 100)} → ${loadPercent(end)}`;
}

// Kurzer Hinweistext zur laufenden Phase, gebildet aus dem Anteil der laufenden
// Woche. null, wenn die Phase keine Last vorgibt. Unter 100 % erklaert er den
// bewusst niedrigen Vorschlag; bei 100 % in der letzten Phase, dass die Vorgabe
// endet.
//
// Der Bezug heisst bewusst "beim Start der Journey" und nicht mehr "vor der
// Pause": Die Lastvorgabe gehoert seit dem Wiederaufbau-Baustein nicht mehr nur
// zur Fasten-Vorlage, und eingefroren wird das Referenzgewicht beim
// Journey-Start (journeyWrite.friereReferenzgewichteEin) - genau das steht
// jetzt auch da.
export function loadFactorNote(
  factor: number | null | undefined,
  isLastPhase: boolean,
): string | null {
  if (factor == null) return null;
  const pct = loadPercent(factor);
  if (!isNeutralLoad(factor) && factor < 1) {
    return `Vorgegebene Last: ${pct} deines Gewichts beim Start der Journey. Der niedrige Vorschlag ist gewollt.`;
  }
  if (isLastPhase) {
    return `Volle Last: ${pct} deines Gewichts beim Start der Journey. Danach endet die Vorgabe und der Coach steuert wieder normal.`;
  }
  return `Volle Last: ${pct} deines Gewichts beim Start der Journey.`;
}
