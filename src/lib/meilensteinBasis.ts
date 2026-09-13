// Basiswerte fuer dynamische Uebungs-Meilensteine (Issue #422).
//
// Ein dynamischer Meilenstein ist ein Faktor auf einen Koerperwert, nicht ein
// fester Zielwert. Der Koerperwert kommt aus den Messungen (composition) und
// schwankt bei BIA-Waagen tagesabhaengig um ein bis zwei Kilogramm. Deshalb
// zaehlt hier nicht die letzte Messung, sondern der Durchschnitt der letzten
// 30 Tage: das Ziel wandert langsam mit dem Koerper mit, statt mit jeder
// Messung zu springen.
//
// Liegt im Fenster keine brauchbare Messung, gibt es keinen Basiswert (null).
// Der Meilenstein ist dann nicht aktiv – er wartet auf eine Messung, statt mit
// einem geratenen Wert zu rechnen.
//
// Rein rechnend: kennt weder Datenbank noch React.

import type { CompositionRow, MeilensteinBasis } from "@/schemas";

/** Laenge des Mittelungsfensters in Tagen. */
export const BASIS_FENSTER_TAGE = 30;

/** Die beiden dynamischen Basiswerte in kg, je null wenn im Fenster nichts
 *  Brauchbares steht. */
export interface MeilensteinBasisWerte {
  koerpergewicht: number | null;
  ffm: number | null;
}

/** Mittelwert der Zahlen, null bei leerer Liste. */
function mittel(werte: number[]): number | null {
  if (werte.length === 0) return null;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}

/** Basiswerte aus den Messungen der letzten `BASIS_FENSTER_TAGE` Tage.
 *
 *  Koerpergewicht mittelt ueber `weight`, die fettfreie Masse ueber
 *  `weight - body_fat_kg`; Zeilen ohne den jeweils noetigen Wert fallen raus.
 *  `heute` wird hereingereicht, damit die Rechnung testbar bleibt. */
export function basisWerte(
  messungen: CompositionRow[],
  heute: string,
): MeilensteinBasisWerte {
  const grenze = new Date(heute);
  grenze.setDate(grenze.getDate() - BASIS_FENSTER_TAGE);
  const abISO = grenze.toISOString().slice(0, 10);

  const imFenster = messungen.filter((m) => m.date >= abISO && m.date <= heute);

  const gewichte = imFenster
    .map((m) => m.weight)
    .filter((w): w is number => w != null);

  const ffm = imFenster
    .filter((m) => m.weight != null && m.body_fat_kg != null)
    .map((m) => (m.weight as number) - (m.body_fat_kg as number));

  return { koerpergewicht: mittel(gewichte), ffm: mittel(ffm) };
}

/** Der Zielwert eines Meilensteins in kg, oder null wenn er (noch) keinen hat.
 *
 *  Feste Meilensteine geben ihr gespeichertes Ziel zurueck. Dynamische rechnen
 *  Faktor mal Basiswert und runden auf halbe Kilogramm – so steht in der
 *  Anzeige "90 kg" statt "89,7 kg", und das Ziel zittert nicht bei jeder neuen
 *  Messung um Gramm-Betraege. Fehlt der Basiswert, ist das Ergebnis null. */
export function zielWert(
  meilenstein: {
    basis: MeilensteinBasis;
    target_rm: number | null;
    faktor: number | null;
  },
  werte: MeilensteinBasisWerte,
): number | null {
  if (meilenstein.basis === "fix") return meilenstein.target_rm;
  if (meilenstein.faktor == null) return null;
  const basis =
    meilenstein.basis === "koerpergewicht" ? werte.koerpergewicht : werte.ffm;
  if (basis == null) return null;
  return Math.round(meilenstein.faktor * basis * 2) / 2;
}

/** Der Zielwert, der in der Karte steht. Bei einem erreichten Meilenstein ist
 *  das der eingefrorene Wert von damals (achieved_target) – ein Erfolg wird
 *  nicht rueckwirkend verschoben, wenn sich der Koerper spaeter aendert. Aeltere
 *  Zeilen ohne eingefrorenen Wert fallen auf die laufende Rechnung zurueck. */
export function anzeigeZiel(
  meilenstein: {
    basis: MeilensteinBasis;
    target_rm: number | null;
    faktor: number | null;
    achieved_at: string | null;
    achieved_target: number | null;
  },
  werte: MeilensteinBasisWerte,
): number | null {
  if (meilenstein.achieved_at != null && meilenstein.achieved_target != null) {
    return meilenstein.achieved_target;
  }
  return zielWert(meilenstein, werte);
}

/** Ausgeschriebener Name der Basis fuer die Anzeige. "fix" hat keine Kennung –
 *  ein festes Ziel braucht keine Erklaerung. */
export const BASIS_NAME: Record<MeilensteinBasis, string> = {
  fix: "Festes Gewicht",
  koerpergewicht: "Körpergewicht",
  ffm: "Fettfreie Masse",
};

/** Kurzform der Basis fuer enge Stellen, heute der Zielart-Umschalter im
 *  Meilenstein-Dialog. Dort stehen drei gleich breite Segmente nebeneinander,
 *  in denen die vollen Namen fast bis an den Rand reichen und optisch
 *  zusammenruecken. Ein Wort pro Segment schafft Luft, ohne unverstaendlich zu
 *  werden: der ausgeschriebene Name steht im selben Dialog direkt darunter am
 *  Faktor-Feld und im Hilfetext. */
export const BASIS_KURZ: Record<MeilensteinBasis, string> = {
  fix: "Fest",
  koerpergewicht: "Körper",
  ffm: "Fettfrei",
};
