// Die Statistikzeile der Journey-Kachel (#283, Schritt 3). Reine Rechnung ohne
// DOM-/DB-Bezug.
//
// Dieselben Kennzahlen wie im Coach-Block der Uebungsseite, nur auf die Journey
// umgerechnet: gefuettert wird die bereits journey-gefilterte Verlaufsliste.
// Stuenden hier die Zahlen der Uebungsseite (ganzer Verlauf, festes
// Sechs-Wochen-Fenster), traefen im selben Block zwei verschiedene Zeitraeume
// aufeinander.

import {
  exBestSet,
  exChangePct,
  repsPerSet,
  type ExHistoryEntry,
} from "./exerciseHistory";
import { fmtNum } from "./format";

// Eine Zelle der Statistikzeile. Formgleich mit StatCell der Oberflaeche, aber
// ohne Bezug darauf – die Rechnung kennt keine Komponenten.
export interface JourneyStat {
  value: string;
  label: string;
  accent?: boolean;
}

// Beste Einzelleistung dieser Journey. Gewichtsuebungen zeigen den besten Satz
// (Gewicht x Wdh); ohne Gewicht zaehlt die beste Haltezeit bzw. die hoechste
// Wiederholungszahl je Arbeitssatz. null, wenn nichts davon vorliegt.
function bestEffort(history: readonly ExHistoryEntry[]): JourneyStat | null {
  const best = exBestSet(history);
  if (best) {
    return {
      value: fmtNum(best.weight) + "×" + best.reps,
      label: "bestes Set",
    };
  }
  const sec = Math.max(0, ...history.map((e) => e.sec));
  if (sec > 0) return { value: fmtNum(sec) + " s", label: "bester Halt" };
  const reps = Math.max(
    0,
    ...history.map((e) => repsPerSet(e) ?? 0),
  );
  if (reps > 0) return { value: fmtNum(reps), label: "beste Wdh" };
  return null;
}

// Statistikzeile einer Uebung fuer ihre Journey-Kachel: beste Leistung,
// Veraenderung seit Journey-Start und die Zahl der Einheiten in dieser Journey.
// Die Veraenderung braucht ein geschaetztes 1RM und faellt deshalb bei Core-
// und Koerpergewichts-Uebungen weg – dort steuert der Coach die Last nicht.
export function buildJourneyStats(
  history: readonly ExHistoryEntry[],
): JourneyStat[] {
  const out: JourneyStat[] = [];
  const best = bestEffort(history);
  if (best) out.push(best);
  const pct = exChangePct(history);
  if (pct != null) out.push({ value: pct, label: "seit Start", accent: true });
  out.push({
    value: String(history.length),
    label: history.length === 1 ? "Einheit" : "Einheiten",
  });
  return out;
}
