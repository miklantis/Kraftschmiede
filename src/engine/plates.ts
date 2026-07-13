// Ladbarkeit und Plate-Loader. Rechnet ohne Stueck-Limit (wie V1): je Scheibe
// gilt nur, ob sie als Gewicht verfuegbar ist, nicht wie viele Stueck vorliegen.

import { plateGrid, round2 } from "./math";

export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateBreakdown {
  perSide: number;
  plates: PlateCount[];
  remainder: number; // > 0 => Zielgewicht nicht exakt ladbar
}

// Naechstes ladbares Gesamtgewicht fuer eine Stange.
// roundDown = abrunden (z. B. fuer den vorsichtigen Wiedereinstieg).
export function nearestLoadable(
  target: number,
  barWeight: number,
  plates: number[],
  roundDown?: boolean,
): number {
  const g = plateGrid(plates);
  const step = 2 * g; // beide Seiten
  if (target <= barWeight) return barWeight;
  let k = (target - barWeight) / step;
  k = roundDown ? Math.floor(k + 1e-9) : Math.round(k);
  if (k < 0) k = 0;
  return round2(barWeight + k * step);
}

// Scheiben pro Seite (greedy, groesste zuerst). total = Gesamtgewicht inkl. Stange.
export function plateBreakdown(
  total: number,
  barWeight: number,
  plates: number[],
): PlateBreakdown {
  let perSide = round2((total - barWeight) / 2);
  if (perSide < 0) perSide = 0;
  const sorted = plates.slice().sort((a, b) => b - a);
  const out: PlateCount[] = [];
  let rem = perSide;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const c = Math.floor((rem + 1e-9) / p);
    if (c > 0) {
      out.push({ plate: p, count: c });
      rem = round2(rem - c * p);
    }
  }
  return { perSide, plates: out, remainder: round2(rem) };
}

// Naechste verfuegbare Kurzhantel-Stufe zu einem Zielgewicht (festes Gewicht je
// Stueck, keine Belade-Rechnung). Gewaehlt wird die naechstgelegene vorhandene
// Stufe; bei genau gleichem Abstand die leichtere (konservativ). roundDown =
// immer abrunden (groesste Stufe <= Ziel), z. B. fuer den Wiedereinstieg. Ist
// kein Bestand vorhanden, bleibt das Zielgewicht unveraendert. Ziel unter der
// leichtesten Stufe -> leichteste; ueber der schwersten -> schwerste.
export function nearestDumbbell(
  target: number,
  steps: number[],
  roundDown?: boolean,
): number {
  if (steps.length === 0) return round2(target);
  const s = steps.slice().sort((a, b) => a - b);
  const min = s[0]!;
  const max = s[s.length - 1]!;
  if (target <= min) return min;
  if (target >= max) return max;
  if (roundDown) {
    let chosen = min;
    for (const w of s) {
      if (w <= target + 1e-9) chosen = w;
      else break;
    }
    return chosen;
  }
  // Naechstgelegene Stufe; bei Gleichstand die leichtere (aufsteigend iteriert,
  // Ersetzen nur bei echt kleinerem Abstand -> die leichtere bleibt bei Gleichstand).
  let best = min;
  let bestDist = Math.abs(target - min);
  for (const w of s) {
    const d = Math.abs(target - w);
    if (d < bestDist - 1e-9) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}
