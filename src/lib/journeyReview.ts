// Rueckschau einer abgeschlossenen Journey: die absolvierten Einheiten nach den
// Phasen der Journey gruppieren. Reine Funktion ohne DB-/DOM-Bezug.
//
// Die Zuordnung kommt nicht aus einer Zeitfenster-Rechnung, sondern aus den zum
// Trainingszeitpunkt eingefrorenen Feldern journey_id/phase_id der Einheit. Was
// keiner Phase zugeordnet ist (aeltere Einheiten), landet in einer eigenen
// Restgruppe, damit nichts unsichtbar wird.

import type { LoadPlan } from "@/engine";
import { longDateShort } from "./format";
import { loadSpanLabel, usesLoadPlan } from "./loadFactor";

export interface ReviewSessionInput {
  id: string;
  date: string;
  type: string;
  status: string;
  journeyId: string | null;
  phaseId: string | null;
  templateId: string | null;
  skillId: string | null;
}

export interface ReviewPhaseInput {
  id: string;
  name: string;
  weeks: number;
  /** Lastliste der Phase; null = die Phase gab keine Last vor. */
  loadPlan: LoadPlan | null;
}

export interface ReviewLookups {
  templateName: (id: string) => string | undefined;
  skillName: (id: string) => string | undefined;
}

export interface ReviewSession {
  id: string;
  date: string;
  dateLabel: string;
  title: string;
}

export interface ReviewGroup {
  /** Phasen-Id, oder "" fuer die Restgruppe ohne Phasenbezug. */
  id: string;
  name: string;
  /** "4 Wochen · 11 Einheiten" bzw. nur die Einheiten in der Restgruppe. */
  meta: string;
  sessions: ReviewSession[];
}

export interface JourneyReview {
  groups: ReviewGroup[];
  totalUnits: number;
}

function titleOf(s: ReviewSessionInput, lk: ReviewLookups): string {
  if (s.type === "yoga") return "Yoga";
  if (s.type === "skill") {
    return (s.skillId ? lk.skillName(s.skillId) : undefined) ?? "Skill";
  }
  return (s.templateId ? lk.templateName(s.templateId) : undefined) ?? "Einheit";
}

function unitsLabel(n: number): string {
  return n === 1 ? "1 Einheit" : n + " Einheiten";
}

export function buildJourneyReview(
  journeyId: string,
  phases: ReviewPhaseInput[],
  sessions: ReviewSessionInput[],
  lk: ReviewLookups,
): JourneyReview {
  const mine = sessions
    .filter((s) => s && s.status === "done" && s.journeyId === journeyId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const view = (s: ReviewSessionInput): ReviewSession => ({
    id: s.id,
    date: s.date,
    dateLabel: longDateShort(s.date),
    title: titleOf(s, lk),
  });

  // Gab die Journey die Last vor, gehoert sie in die Rueckschau - sonst ist
  // spaeter nicht mehr erkennbar, warum die ersten Wochen leichter waren. Die
  // Phase ist abgeschlossen, es gibt also keine laufende Woche: gezeigt wird die
  // Spanne ("65 → 95 %"). Phasen ohne eigene Liste lassen den Abschnitt weg.
  const withLoad = usesLoadPlan(phases.map((p) => p.loadPlan));
  const known = new Set(phases.map((p) => p.id));
  const groups: ReviewGroup[] = phases.map((p) => {
    const list = mine.filter((s) => s.phaseId === p.id).map(view);
    const lastLabel = withLoad ? loadSpanLabel(p.loadPlan) : null;
    return {
      id: p.id,
      name: p.name,
      meta: [
        p.weeks === 1 ? "1 Woche" : p.weeks + " Wochen",
        unitsLabel(list.length),
        ...(lastLabel === null ? [] : [lastLabel + " Last"]),
      ].join(" · "),
      sessions: list,
    };
  });

  const rest = mine
    .filter((s) => s.phaseId === null || !known.has(s.phaseId))
    .map(view);
  if (rest.length > 0) {
    groups.push({
      id: "",
      name: "Ohne Phasenbezug",
      meta: unitsLabel(rest.length),
      sessions: rest,
    });
  }

  return { groups, totalUnits: mine.length };
}
