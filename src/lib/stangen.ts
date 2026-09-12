// Zulassung der Stangen je Uebung - die eine Stelle, an der entschieden wird,
// mit welchen Stangen eine Uebung ueberhaupt ausfuehrbar ist (Vorhaben #433).
//
// Gleiche Bauform wie `misstGewicht` in lib/exercises.ts: eine kleine, reine
// Regel ohne DB- oder DOM-Bezug, die alle Aufrufer teilen. Das Auswahlfeld in
// der laufenden Einheit und die Stangenwahl des Coaches lesen dieselbe Fassung,
// damit die angebotene Liste und der Vorschlag nie auseinanderlaufen.

import type { BarLength, BarShape } from "@/schemas";

/** Bauart einer Stange, so viel davon wie die Zulassung braucht. */
export interface StangenBauart {
  barLength: BarLength;
  barShape: BarShape;
}

/**
 * Was eine Uebung an der Stange voraussetzt: je Eigenschaft die zugelassenen
 * Werte.
 *
 * Die Listen sind bindend - was dort steht, ist zugelassen, der Rest ist fuer
 * diese Uebung nicht ausfuehrbar (nicht "unbeliebt"). Wo eine Eigenschaft alle
 * ihre Werte zulaesst, schraenkt sie nichts ein; die Voraussetzung entsteht
 * allein dadurch, dass ein Wert weggelassen wird.
 *
 * Eine LEERE (oder fehlende) Liste ist dagegen keine Aussage "nichts ist
 * erlaubt", sondern "keine Angabe": sie schraenkt nicht ein. Sonst wuerde jede
 * Uebung ohne gepflegte Angabe still jede Stange verlieren. Uebungen ohne
 * Stange (Kurzhantel, Scheibe, Band, Koerpergewicht) lassen beide Listen leer.
 */
export interface StangenVoraussetzung {
  allowedBarLengths?: readonly BarLength[] | null;
  allowedBarShapes?: readonly BarShape[] | null;
}

function wertZugelassen<T extends string>(
  zugelassen: readonly T[] | null | undefined,
  wert: T,
): boolean {
  if (!zugelassen || zugelassen.length === 0) return true;
  return zugelassen.includes(wert);
}

/** Erfuellt diese Stange die Voraussetzung der Uebung? Beides muss zutreffen:
 *  die Laenge muss zugelassen sein UND die Form. */
export function stangeErfuelltVoraussetzung(
  bar: StangenBauart,
  exo: StangenVoraussetzung,
): boolean {
  return (
    wertZugelassen(exo.allowedBarLengths, bar.barLength) &&
    wertZugelassen(exo.allowedBarShapes, bar.barShape)
  );
}

/** Die Stangen des Bestands, mit denen die Uebung ausfuehrbar ist - in der
 *  Reihenfolge, in der sie hereingereicht wurden.
 *
 *  Kein Rueckfall auf den Gesamtbestand, wenn nichts uebrig bleibt: eine Stange
 *  anzubieten, mit der die Uebung nicht ausfuehrbar ist, waere schlechter als
 *  gar keine. Die leere Liste ist ein gueltiges Ergebnis, das die Aufrufer
 *  offen zeigen. */
export function zugelasseneStangen<B extends StangenBauart>(
  bars: readonly B[],
  exo: StangenVoraussetzung,
): B[] {
  return bars.filter((b) => stangeErfuelltVoraussetzung(b, exo));
}
