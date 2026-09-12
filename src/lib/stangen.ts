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

/**
 * Was einer Uebung unter mehreren zugelassenen Stangen am liebsten ist - je
 * Eigenschaft ein bevorzugter Wert, der leer bleiben darf.
 *
 * Die Bevorzugung schraenkt NIE ein: sie kann keine Stange ausschliessen, die
 * die Voraussetzung erfuellt, sondern entscheidet allein die Reihenfolge. Die
 * beiden Ebenen sind streng getrennt - die Voraussetzung sagt, OB eine Stange
 * erscheint, die Bevorzugung nur, IN WELCHER REIHENFOLGE.
 */
export interface StangenBevorzugung {
  preferredBarLength?: BarLength | null;
  preferredBarShape?: BarShape | null;
}

/** Gibt es ueberhaupt eine Bevorzugung? Ohne sie bleibt es bei der bisherigen
 *  Regel (schwerste Stange unterhalb des Zielgewichts). */
export function hatBevorzugung(exo: StangenBevorzugung): boolean {
  return exo.preferredBarLength != null || exo.preferredBarShape != null;
}

/** Ist diese Stange eine der bevorzugten? Gesetzte Werte muessen alle
 *  zutreffen; eine nicht gesetzte Eigenschaft sagt nichts und schliesst nichts
 *  aus. Ohne jede Bevorzugung ist jede Stange "bevorzugt" - die Gruppe ist dann
 *  der ganze Bestand und die Reihenfolge bleibt unveraendert. */
export function stangeIstBevorzugt(
  bar: StangenBauart,
  exo: StangenBevorzugung,
): boolean {
  if (exo.preferredBarLength != null && bar.barLength !== exo.preferredBarLength) {
    return false;
  }
  if (exo.preferredBarShape != null && bar.barShape !== exo.preferredBarShape) {
    return false;
  }
  return true;
}
