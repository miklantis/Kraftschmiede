// Lastseite der Phasensteuerung: die geplante Intensitaet in Prozent des 1RM
// rampt ueber die Phasenwochen hoch, in der Entlastungswoche faellt sie zurueck.
// Das Gegenstueck zur Satzzahl in volume.ts – zusammen sind das die beiden
// Steuerraeder einer Phase (Issue #200).
//
// Reine Rechnung ohne DB-/DOM-Bezug. Ob eine Phase die Last ueberhaupt plant,
// entscheidet der Aufrufer: ohne intensity_start/intensity_end kommt null
// zurueck und das Gewicht bleibt Sache des Coaches.

// Anteil der Vorwochen-Intensitaet, der in der Entlastungswoche stehen bleibt.
// Beim Volumen sind es 50 %; bei der Last waere das absurd – wer in der
// Kraftphase mit 82,5 % arbeitet, laedt in der Entlastungswoche nicht 41 %,
// sondern rund 70 %. 85 % trifft genau diesen Korridor.
const DELOAD_ANTEIL_LAST = 0.85;

export interface IntensityPhase {
  intensityStart?: number | null;
  intensityEnd?: number | null;
  weeks?: number | null;
  deloadWeek?: number | null;
}

// Anzahl der Aufbauwochen einer Phase: alle Wochen ausser der Entlastungswoche.
// Mindestens 1, damit die Interpolation nicht durch null teilt.
function aufbauWochen(weeks: number, deloadWeek: number | null): number {
  const deload = deloadWeek != null && deloadWeek >= 1 && deloadWeek <= weeks ? 1 : 0;
  return Math.max(1, weeks - deload);
}

// Position einer Woche in der Rampe der Aufbauwochen (0-basiert). Wochen nach
// der Entlastungswoche ruecken um eine Stelle vor, damit die Rampe nicht stehen
// bleibt, wenn die Entlastung mitten in der Phase liegt.
function aufbauIndex(weekIndex: number, deloadWeek: number | null): number {
  if (deloadWeek != null && weekIndex > deloadWeek - 1) return weekIndex - 1;
  return weekIndex;
}

// Lineare Intensitaets-Rampe ueber die Aufbauwochen. Bewusst anders als rampSets
// in volume.ts: dort wird ueber alle Wochen interpoliert, hier ohne die
// Entlastungswoche – sonst wuerde intensity_end in einer Phase, die mit der
// Entlastung endet, nie erreicht.
export function rampIntensity(
  i0: number,
  i1: number,
  weekIndex: number,
  weeks: number,
  deloadWeek: number | null,
): number {
  const n = aufbauWochen(weeks, deloadWeek);
  if (n <= 1) return i1;
  const idx = Math.max(0, Math.min(n - 1, aufbauIndex(weekIndex, deloadWeek)));
  return i0 + (i1 - i0) * (idx / (n - 1));
}

// Geplante Intensitaet einer Woche in Prozent des 1RM. null, wenn die Phase die
// Last nicht plant. deloadWeek ist 1-basiert (Wochennummer der Phase),
// weekIndex 0-basiert – daher der Vergleich gegen deloadWeek - 1, wie in
// volumeForWeek.
export function intensityForWeek(
  phase: IntensityPhase,
  weekIndex: number,
): number | null {
  const i0 = phase.intensityStart;
  const i1 = phase.intensityEnd;
  if (i0 == null || i1 == null || !(i0 > 0) || !(i1 > 0)) return null;

  const weeks = Math.max(1, phase.weeks || 1);
  const deloadWeek = phase.deloadWeek ?? null;
  const wi = Math.max(0, Math.min(weeks - 1, weekIndex));

  if (deloadWeek != null && wi === deloadWeek - 1) {
    // Entlastung: Anteil der Intensitaet, die ohne sie in dieser Woche
    // angestanden haette. In Woche 1 gibt es keine Vorwoche, dann greift der
    // Startwert.
    const vorher = wi > 0
      ? rampIntensity(i0, i1, wi - 1, weeks, deloadWeek)
      : i0;
    return vorher * DELOAD_ANTEIL_LAST;
  }

  return rampIntensity(i0, i1, wi, weeks, deloadWeek);
}

// Anteil, mit dem die Wochenlast am Anker der Phase haengt: 1.0 in der ersten
// Aufbauwoche, darueber in den spaeteren. Der Anker wird beim Eintritt in die
// Phase gesetzt und entspricht dem Arbeitsgewicht bei intensity_start; alle
// weiteren Wochen ergeben sich als Vielfaches davon. null, wenn die Phase die
// Last nicht plant.
export function loadShareForWeek(
  phase: IntensityPhase,
  weekIndex: number,
): number | null {
  const i0 = phase.intensityStart;
  const iw = intensityForWeek(phase, weekIndex);
  if (iw == null || i0 == null || !(i0 > 0)) return null;
  return iw / i0;
}

// Plant die Phase die Last? Eine Stelle fuer alle Aufrufer, damit die Weiche
// nicht an mehreren Orten verschieden ausfaellt.
export function plansLoad(phase: IntensityPhase): boolean {
  const i0 = phase.intensityStart;
  const i1 = phase.intensityEnd;
  return i0 != null && i1 != null && i0 > 0 && i1 > 0;
}
