// Archiv abgeschlossener Journeys: aus den Journey-Zeilen und dem Trainings-
// verlauf die Anzeige-Eintraege bauen (Name, Zeitraum von-bis, Dauer, Einheiten).
// Reine Funktion ohne DB-/DOM-Bezug, wie die uebrigen Anzeige-Bausteine.
//
// Zeitraum: vorrangig die gespeicherten Journey-Daten (start_date/end_date).
// Aeltere Journeys tragen kein Enddatum – dort springt der Verlauf ein: erste
// bzw. letzte zaehlende Einheit dieser Journey. So bleibt auch der Altbestand
// lesbar, ohne dass irgendwo Daten nachgetragen werden muessen.

import { longDateYearDE } from "./format";

export interface ArchivedJourneyInput {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

// Einheit, soweit das Archiv sie braucht.
export interface ArchiveSession {
  date: string;
  status: string;
  journeyId: string | null;
}

export interface ArchivedJourneyView {
  id: string;
  name: string;
  /** "12. März 2026 – 5. Juni 2026", "seit 12. März 2026" oder "" ohne Daten. */
  range: string;
  /** "12 Wochen" bzw. "1 Woche"; "" wenn der Zeitraum unbekannt ist. */
  duration: string;
  /** Abgeschlossene Einheiten, die dieser Journey zugeordnet sind. */
  units: number;
  /** Sortierschluessel (spaetestes bekanntes Datum), nur intern. */
  sortKey: string;
}

const DAY_MS = 86400000;

function dayMs(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getTime();
}

// Dauer in vollen Wochen zwischen zwei Tagen, beide eingeschlossen. Aufgerundet,
// mindestens eine Woche – eine Journey dauert nie "null Wochen".
export function weeksBetween(from: string, to: string): number {
  const days = Math.round((dayMs(to) - dayMs(from)) / DAY_MS) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

export function buildArchivedJourneys(
  journeys: ArchivedJourneyInput[],
  sessions: ArchiveSession[],
): ArchivedJourneyView[] {
  // Verlaufsspanne je Journey einmal vorberechnen (erste/letzte Einheit).
  const first: Record<string, string> = {};
  const last: Record<string, string> = {};
  const count: Record<string, number> = {};
  for (const s of sessions) {
    if (!s || s.status !== "done" || !s.journeyId || !s.date) continue;
    const id = s.journeyId;
    count[id] = (count[id] ?? 0) + 1;
    if (first[id] === undefined || s.date < first[id]) first[id] = s.date;
    if (last[id] === undefined || s.date > last[id]) last[id] = s.date;
  }

  const views = journeys.map((j) => {
    const from = j.startDate ?? first[j.id] ?? null;
    const to = j.endDate ?? last[j.id] ?? null;

    let range = "";
    if (from && to) range = longDateYearDE(from) + " – " + longDateYearDE(to);
    else if (from) range = "seit " + longDateYearDE(from);
    else if (to) range = "bis " + longDateYearDE(to);

    let duration = "";
    if (from && to) {
      const w = weeksBetween(from, to);
      duration = w === 1 ? "1 Woche" : w + " Wochen";
    }

    return {
      id: j.id,
      name: j.name,
      range,
      duration,
      units: count[j.id] ?? 0,
      sortKey: to ?? from ?? "",
    };
  });

  // Neueste zuerst; Journeys ohne jedes Datum ans Ende.
  return views.sort((a, b) => {
    if (a.sortKey === b.sortKey) return a.name.localeCompare(b.name, "de");
    if (a.sortKey === "") return 1;
    if (b.sortKey === "") return -1;
    return a.sortKey < b.sortKey ? 1 : -1;
  });
}
