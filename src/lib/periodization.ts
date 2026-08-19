import { volumeForWeek, weekPlanForWeek } from "@/engine";
import type { WeekPlanWeek } from "@/engine";
import type { JourneyPhaseInput } from "@/lib/journey";
import { isNeutralLoad, loadPercent } from "@/lib/loadFactor";

// Reine Aufbereitung der Daten fuer die Periodisierungskurve, 1:1 aus V1
// (charts.js drawJourneyChart, Datenteil). Kein DOM-/D3-Bezug: hier entstehen nur
// die Zahlenreihen, die der Chart-Baustein spaeter zeichnet. Dadurch testbar.
//
// Pro Journey-Woche zwei Werte: Volumen (Satzzahl aus der Engine, mit Satz-Rampe
// und Deload-Einbruch) und Intensitaet (aus der Wiederholungsspanne der Phase
// abgeleitet: wenige Wiederholungen = hohe Intensitaet). Dazu die Phasen als
// Baender ueber ihre Wochenspanne und die aktuelle Gesamtwoche als "jetzt"-Index.
//
// Traegt die Phase einen Wochenplan (Kraft, Schnellkraft, Test), kommen beide
// Werte wochengenau aus dem Plan statt aus den Eckwerten der Phase (Issue #225,
// Schritt 6): die Kraftphase steigt mit ihrer Wiederholungsleiter sichtbar an,
// die Kombiwoche bricht ein. Phasen ohne Plan rechnen unveraendert weiter.

// Eine Woche auf der Zeitachse. g = 0-basierte Gesamtwoche der Journey.
export interface PeriodWeek {
  g: number;
  vol: number;
  intens: number;
  deload: boolean;
}

// Eine Phase als Band ueber ihre Wochenspanne (start/end 0-basiert, inklusive).
export interface PeriodBand {
  name: string;
  start: number;
  end: number;
  /** "65 %" bei vorgegebener Last, sonst null (Beschriftung unter der Achse). */
  loadLabel: string | null;
}

// Vollstaendiges Anzeige-Modell der Kurve. Wertebereiche (min/max) sind fuer die
// vertikale Skalierung der beiden Linien gedacht.
export interface PeriodizationData {
  weeks: PeriodWeek[];
  bands: PeriodBand[];
  curG: number; // 0-basierte aktuelle Gesamtwoche, auf [0, N-1] geklemmt
  vMin: number;
  vMax: number;
  iMin: number;
  iMax: number;
}

// Intensitaets-Score einer Phase aus der Wiederholungsspanne. Fehlt die Spanne,
// gilt ein Mittel von 8 Wiederholungen (wie V1). Gibt die Phase die Last vor
// (Lastfaktor < 1), zaehlt sie entsprechend weniger intensiv – sonst zeigte die
// Kurve einer Wiederaufbau-Journey vier gleich intensive Wochen, obwohl in
// Woche 1 nur 65 % des alten Gewichts auf der Stange liegen.
function intensityScore(
  min: number | null,
  max: number | null,
  loadFactor: number,
): number {
  const mid = min != null && max != null ? (min + max) / 2 : 8;
  const load = loadFactor > 0 ? loadFactor : 1;
  return load / Math.max(1, mid);
}

// Intensitaets-Score einer Planwoche: die Wiederholungen genau dieser Woche
// statt der Spanne der ganzen Phase, dazu der Anteil des Arbeitsgewichts aus dem
// Plan (Kombiwoche: 60 %). Dadurch steigt die Linie innerhalb der Kraftphase mit
// der Wiederholungsleiter und faellt in der Kombiwoche deutlich ab.
function planIntensityScore(week: WeekPlanWeek, loadFactor: number): number {
  const mid =
    week.repsMax != null && week.repsMax !== week.reps
      ? (week.reps + week.repsMax) / 2
      : week.reps;
  const phaseLoad = loadFactor > 0 ? loadFactor : 1;
  const weekLoad = week.loadPct > 0 ? week.loadPct : 1;
  return (phaseLoad * weekLoad) / Math.max(1, mid);
}

// Baut aus den Phasen einer aktiven Journey und der aktuellen Gesamtwoche
// (1-basiert, aus engine.journeyPlacement) das Kurven-Modell.
export function buildPeriodization(
  phases: JourneyPhaseInput[],
  globalWeek: number,
): PeriodizationData {
  const weeks: PeriodWeek[] = [];
  const bands: PeriodBand[] = [];
  let gw = 0;
  let vMin = Infinity;
  let vMax = -Infinity;
  let iMin = Infinity;
  let iMax = -Infinity;

  phases.forEach((p, pi) => {
    const pw = Math.max(1, p.weeks || 1);
    const iScore = intensityScore(p.repTargetMin, p.repTargetMax, p.loadFactor);
    bands.push({
      name: p.name || `Phase ${pi + 1}`,
      start: gw,
      end: gw + pw - 1,
      loadLabel: isNeutralLoad(p.loadFactor) ? null : loadPercent(p.loadFactor),
    });
    for (let wi = 0; wi < pw; wi++) {
      // Wochenzeile des Plans (1-basiert); null = die Phase laeuft ohne Plan.
      const row = p.weekPlan ? weekPlanForWeek(p.weekPlan, wi + 1) : null;
      const vol = row
        ? row.sets
        : volumeForWeek(
            {
              setsStart: p.setsStart,
              setsEnd: p.setsEnd,
              weeks: p.weeks,
              deloadWeek: p.deloadWeek,
            },
            wi,
            true,
          );
      const intens = row ? planIntensityScore(row, p.loadFactor) : iScore;
      weeks.push({
        g: gw,
        vol,
        intens,
        // Im Plan macht der Anteil am Arbeitsgewicht die Entlastungswoche aus
        // (Kombiwoche), sonst die gesetzte Deload-Woche der Phase.
        deload: row
          ? row.loadPct < 1
          : !!(p.deloadWeek && wi === p.deloadWeek - 1),
      });
      vMin = Math.min(vMin, vol);
      vMax = Math.max(vMax, vol);
      iMin = Math.min(iMin, intens);
      iMax = Math.max(iMax, intens);
      gw++;
    }
  });

  const N = weeks.length;
  const curG = N > 0 ? Math.max(0, Math.min(globalWeek - 1, N - 1)) : 0;

  // Bei leerer Journey neutrale Bereiche, damit nachgelagerte Rechnungen nicht
  // mit Infinity arbeiten. Die Kurve wird in diesem Fall ohnehin nicht gezeichnet.
  if (N === 0) {
    return { weeks, bands, curG, vMin: 0, vMax: 1, iMin: 0, iMax: 1 };
  }

  return { weeks, bands, curG, vMin, vMax, iMin, iMax };
}
