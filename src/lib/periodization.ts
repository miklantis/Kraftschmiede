import { volumeForWeek } from "@/engine";
import type { JourneyPhaseInput } from "@/lib/journey";

// Reine Aufbereitung der Daten fuer die Periodisierungskurve, 1:1 aus V1
// (charts.js drawJourneyChart, Datenteil). Kein DOM-/D3-Bezug: hier entstehen nur
// die Zahlenreihen, die der Chart-Baustein spaeter zeichnet. Dadurch testbar.
//
// Pro Journey-Woche zwei Werte: Volumen (Satzzahl aus der Engine, mit Satz-Rampe
// und Deload-Einbruch) und Intensitaet (aus der Wiederholungsspanne der Phase
// abgeleitet: wenige Wiederholungen = hohe Intensitaet). Dazu die Phasen als
// Baender ueber ihre Wochenspanne und die aktuelle Gesamtwoche als "jetzt"-Index.

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
// gilt ein Mittel von 8 Wiederholungen (wie V1).
function intensityScore(min: number | null, max: number | null): number {
  const mid = min != null && max != null ? (min + max) / 2 : 8;
  return 1 / Math.max(1, mid);
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
    const iScore = intensityScore(p.repTargetMin, p.repTargetMax);
    bands.push({
      name: p.name || `Phase ${pi + 1}`,
      start: gw,
      end: gw + pw - 1,
    });
    for (let wi = 0; wi < pw; wi++) {
      const vol = volumeForWeek(
        {
          setsStart: p.setsStart,
          setsEnd: p.setsEnd,
          weeks: p.weeks,
          deloadWeek: p.deloadWeek,
        },
        wi,
        true,
      );
      weeks.push({
        g: gw,
        vol,
        intens: iScore,
        deload: !!(p.deloadWeek && wi === p.deloadWeek - 1),
      });
      vMin = Math.min(vMin, vol);
      vMax = Math.max(vMax, vol);
      iMin = Math.min(iMin, iScore);
      iMax = Math.max(iMax, iScore);
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
