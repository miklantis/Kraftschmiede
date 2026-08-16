// Zeitliche x-Platzierung fuer Verlaufs-Charts. Reine Rechnung ohne DOM-Bezug.
//
// Charts, die eine Reihe von Punkten ueber die Zeit zeigen, sollen Pausen als
// Luecke zeigen statt alle Punkte gleichmaessig zu verteilen. timeSlots
// liefert dafuer je Punkt seinen Tagesabstand zum aeltesten Punkt.

const DAY_MS = 86400000;

/**
 * Tagesabstaende der Punkte zum aeltesten Datum (ISO, YYYY-MM-DD).
 *
 * Liefert null, wenn keine zeitliche Achse moeglich oder sinnvoll ist:
 * weniger als zwei Punkte, ein unlesbares Datum, oder alle Punkte am selben
 * Tag. Der Aufrufer verteilt dann gleichmaessig nach Reihenfolge.
 */
export function timeSlots(dates: readonly string[]): number[] | null {
  if (dates.length < 2) return null;
  const ms = dates.map((d) => Date.parse(d));
  if (ms.some((t) => Number.isNaN(t))) return null;
  const first = Math.min(...ms);
  const span = Math.max(...ms) - first;
  if (span <= 0) return null;
  return ms.map((t) => (t - first) / DAY_MS);
}
