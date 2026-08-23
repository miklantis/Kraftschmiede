// Journey-Platzierung: leitet aus dem Trainingsverlauf ab, in welcher Phase und
// Woche die aktive Journey gerade steht, wie weit die laufende Kalenderwoche
// erfuellt ist und ob die Journey durchlaufen ist. Reine Funktionen ohne
// DB-/DOM-Bezug; der Aufrufer reicht Sessions, Phasen, Frequenzziel und das
// Bezugsdatum herein.
//
// Grundidee: eine Journey-Woche gilt als erfuellt, wenn in ihr mindestens
// freqTarget zaehlende Einheiten liegen. Phase und Woche-in-Phase werden daraus
// abgeleitet, nicht von Hand gesetzt. Keine Pausenlogik: eine Woche ohne genug
// Einheiten zaehlt einfach nicht und schiebt nichts.
//
// Genau eine Ausnahme, und sie steht an genau einer Stelle (#240): eine
// Journey-Woche, die gar keine Einheit verlangt, erfuellt sich selbst. Das ist
// die reine Testwoche am Ende einer Testphase - sie plant nichts (sets 0 im
// Wochenplan), also kann sie an nichts haengen bleiben. Damit ist die Journey
// durchlaufen, sobald alle geplanten Wochen erfuellt und vorbei sind; ob
// tatsaechlich getestet wurde, prueft niemand.
//
// Weil diese Ausnahme an der Journey-Wochennummer haengt, die sich ihrerseits
// aus den erfuellten Wochen davor ergibt, laeuft die Rechnung Kalenderwoche fuer
// Kalenderwoche vorwaerts (fulfilledWeeks) statt ueber eine Menge von
// Wochenschluesseln.

import { weekDemandsSession, weekPlanForWeek, type WeekPlan } from "./weekPlan";

// Minimal benoetigte Session-Form. Die datenbeschaffende Schicht mappt die
// snake_case-DB-Zeilen (journey_id) auf diese Engine-Form (journeyId).
export interface JourneySession {
  date: string;
  status: string;
  type: string;
  journeyId: string | null;
}

// Phase, soweit die Platzierung sie braucht: Id, Wochenzahl und Wochenplan.
// Der Plan gehoert dazu, weil nur er sagt, ob eine Woche ueberhaupt eine Einheit
// verlangt (reine Testwoche = 0 Saetze). Bewusst ein eigenes Feld statt der
// DB-Spalte week_plan: so faellt beim Typecheck auf, wenn ein Aufrufer die
// Phasen nicht ueber toPlacementPhases hereinreicht.
export interface PhaseLike {
  id: string;
  weeks: number;
  weekPlan: WeekPlan | null;
}

export interface JourneyLike {
  id: string;
  phases: PhaseLike[];
}

export interface Placement {
  phaseIndex: number;
  phaseId: string | null;
  weekInPhase: number;
  done: boolean;
  globalWeek: number;
}

export interface WeekProgress {
  isoKey: string;
  weekNum: number;
  units: number;
  target: number;
  fulfilled: boolean;
  journeyWeek: number;
}

// Repband einer konkreten Phase: die explizit gesetzten Grenzen der Phasenzeile.
// null = kein Phasen-Repband, die Uebung bestimmt selbst. Frueher fiel ein
// fehlendes Band auf eine Fokus-Liste im Code zurueck; seit die Bausteine die
// Quelle sind, traegt jede Phase ihr Band beim Anlegen mit (Konzept Abschnitt 2).
export function phaseRepBand(
  repTargetMin: number | null,
  repTargetMax: number | null,
): [number, number] | null {
  if (repTargetMin != null && repTargetMax != null) {
    return [repTargetMin, repTargetMax];
  }
  return null;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

// Datum "YYYY-MM-DD" aus einem Date (lokale Zeitzone, wie ueberall in der App).
function isoDateOf(d: Date): string {
  return (
    d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate())
  );
}

// Montag der ISO-Woche, in der dateStr liegt. Startpunkt der Wochen-fuer-Wochen-
// Rechnung; von hier aus geht es in Schritten von sieben Tagen weiter.
function mondayOf(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// ISO-8601-Wochenschluessel "YYYY-Www" zu einem Datum "YYYY-MM-DD". Feste Breite,
// daher entspricht der lexikografische Vergleich der chronologischen Reihenfolge.
export function isoWeekKey(dateStr: string): string {
  return isoWeekKeyOf(new Date(dateStr + "T00:00:00"));
}

/** Sonntag der Kalenderwoche, in der dateStr liegt ("YYYY-MM-DD"). Die Frist der
 *  laufenden Woche - in der reinen Testwoche der Tag, an dem die Journey
 *  durchlaeuft, ob getestet wurde oder nicht (#240). */
export function sundayOfWeek(dateStr: string): string {
  const d = mondayOf(dateStr);
  d.setDate(d.getDate() + 6);
  return isoDateOf(d);
}

function isoWeekKeyOf(d: Date): string {
  const t = new Date(d.valueOf());
  const day = (d.getDay() + 6) % 7; // Mo=0 .. So=6
  t.setDate(t.getDate() - day + 3); // Donnerstag der ISO-Woche
  const firstThu = new Date(t.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((t.getTime() - firstThu.getTime()) / 86400000 -
        3 +
        ((firstThu.getDay() + 6) % 7)) /
        7,
    );
  return t.getFullYear() + "-W" + pad2(week);
}

// Wochennummer aus einem Schluessel "YYYY-Www" (z. B. 31). 0 wenn ungueltig.
export function isoWeekNumOf(key: string): number {
  const m = /W(\d+)$/.exec(key || "");
  return m ? parseInt(m[1], 10) : 0;
}

// Zaehlende Einheiten einer Journey: abgeschlossen, kein Yoga, passende journeyId.
function countingSessions(
  sessions: JourneySession[],
  journeyId: string,
): JourneySession[] {
  return (sessions || []).filter(
    (s) =>
      s &&
      s.status === "done" &&
      s.type !== "yoga" &&
      s.journeyId === journeyId &&
      !!s.date,
  );
}

// Verlangt diese Journey-Woche ueberhaupt eine Einheit? Verneinen kann das nur
// eine Phase mit Wochenplan, und dort nur die reine Testwoche (0 Saetze). Ohne
// Plan - und jenseits der letzten geplanten Woche - gilt das gewohnte
// Wochenziel.
function weekDemandsWork(
  phases: readonly PhaseLike[],
  journeyWeek: number,
): boolean {
  const p = phasePlacement(phases, journeyWeek);
  if (p.done) return true;
  const phase = phases[p.phaseIndex];
  if (!phase || !phase.weekPlan) return true;
  return weekDemandsSession(weekPlanForWeek(phase.weekPlan, p.weekInPhase));
}

/** Erfuellte Kalenderwochen einer Journey, Woche fuer Woche vorwaerts gerechnet. */
interface FulfilledWeeks {
  /** Anzahl erfuellter Wochen STRIKT VOR dieser Kalenderwoche. */
  before(key: string): number;
  /** Ist diese Kalenderwoche erfuellt? */
  has(key: string): boolean;
  /** Sonntag der n-ten erfuellten Woche (1-basiert); "" wenn es sie nicht gibt.
   *  Setzt voraus, dass bis dorthin schon gerechnet wurde (before/has). */
  sundayOf(n: number): string;
}

// Zwei Wege, wie eine Kalenderwoche erfuellt wird: genug zaehlende Einheiten
// (>= freqTarget) oder die Journey-Woche verlangt gar keine Einheit. Der zweite
// Weg haengt an der Journey-Wochennummer, die sich aus den erfuellten Wochen
// davor ergibt - deshalb wird ab der ersten Einheit der Journey Woche fuer Woche
// vorwaerts gegangen, statt eine Menge von Schluesseln zu bilden.
//
// Der Zeiger geht nur vorwaerts und bewertet jede Woche genau einmal; spaetere
// Abfragen setzen dort auf, wo die letzte aufgehoert hat. Ohne eine einzige
// zaehlende Einheit gibt es keinen Anfang: die Journey steht dann auf Woche 1.
function fulfilledWeeks(
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  phases: readonly PhaseLike[],
): FulfilledWeeks {
  const target = Math.max(1, freqTarget || 1);
  const counts: Record<string, number> = {};
  let firstDate = "";
  for (const s of countingSessions(sessions, journeyId)) {
    const k = isoWeekKey(s.date);
    counts[k] = (counts[k] || 0) + 1;
    if (!firstDate || s.date < firstDate) firstDate = s.date;
  }

  const keys: string[] = []; // erfuellte Wochenschluessel, aufsteigend
  const mondays: string[] = []; // Montag je erfuellter Woche, gleiche Ordnung
  const seen: Record<string, true> = {};
  const cursor = firstDate ? mondayOf(firstDate) : null;

  function walk(limit: string, inclusive: boolean): void {
    if (!cursor) return;
    for (;;) {
      const key = isoWeekKeyOf(cursor);
      if (inclusive ? key > limit : key >= limit) return;
      if (!weekDemandsWork(phases, keys.length + 1) || (counts[key] || 0) >= target) {
        keys.push(key);
        mondays.push(isoDateOf(cursor));
        seen[key] = true;
      }
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  return {
    before(key: string): number {
      walk(key, false);
      let n = 0;
      for (const k of keys) {
        if (k < key) n++;
        else break;
      }
      return n;
    },
    has(key: string): boolean {
      walk(key, true);
      return seen[key] === true;
    },
    sundayOf(n: number): string {
      const monday = mondays[n - 1];
      if (!monday) return "";
      const d = new Date(monday + "T00:00:00");
      d.setDate(d.getDate() + 6);
      return isoDateOf(d);
    },
  };
}

// Journey-Wochennummer (1-basiert) der Kalenderwoche, in der dateStr liegt:
// erfuellte Wochen STRIKT VOR dieser Woche + 1. Die laufende Woche behaelt ihre
// Nummer Mo–So und wird erst rueckwirkend erfuellt.
export function journeyWeekForDate(
  dateStr: string,
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  phases: readonly PhaseLike[],
): number {
  return (
    fulfilledWeeks(sessions, journeyId, freqTarget, phases).before(
      isoWeekKey(dateStr),
    ) + 1
  );
}

/** Nachschlage-Funktion Datum -> Journey-Wochennummer. Gleiche Rechnung wie
 *  journeyWeekForDate, aber die erfuellten Wochen werden nur einmal bestimmt -
 *  gedacht fuer Aufrufer, die viele Einheiten einsortieren muessen (z. B. „letzte
 *  Einheit dieser Uebung in der Vorwoche"). */
export function journeyWeekLookup(
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  phases: readonly PhaseLike[],
): (dateStr: string) => number {
  const weeks = fulfilledWeeks(sessions, journeyId, freqTarget, phases);
  return (dateStr: string): number => weeks.before(isoWeekKey(dateStr)) + 1;
}

// Mapping globale Wochennummer -> Phase + Woche-in-Phase. globalWeek groesser als
// die Summe aller Phasenwochen => done:true (Journey durchlaufen).
export function phasePlacement(
  phases: readonly PhaseLike[],
  globalWeek: number,
): Omit<Placement, "globalWeek"> {
  const ps = phases || [];
  let acc = 0;
  for (let i = 0; i < ps.length; i++) {
    const w = ps[i].weeks || 0;
    if (globalWeek <= acc + w) {
      return {
        phaseIndex: i,
        phaseId: ps[i].id,
        weekInPhase: globalWeek - acc,
        done: false,
      };
    }
    acc += w;
  }
  const last = ps.length - 1;
  return {
    phaseIndex: last,
    phaseId: last >= 0 ? ps[last].id : null,
    weekInPhase: last >= 0 ? ps[last].weeks || 0 : 0,
    done: true,
  };
}

// Aktuelle Platzierung der Journey (Phase + Woche-in-Phase + globale Woche) zum
// Bezugsdatum today ("YYYY-MM-DD").
export function journeyPlacement(
  journey: JourneyLike,
  sessions: JourneySession[],
  freqTarget: number,
  today: string,
): Placement {
  const phases = journey.phases || [];
  const gw = journeyWeekForDate(today, sessions, journey.id, freqTarget, phases);
  const p = phasePlacement(phases, gw);
  return { ...p, globalWeek: gw };
}

// Summe aller Phasenwochen einer Journey = geplante Gesamtdauer in Wochen.
export function totalJourneyWeeks(phases: readonly PhaseLike[]): number {
  return (phases || []).reduce((sum, p) => sum + (p.weeks || 0), 0);
}

/** Enddatum einer durchlaufenen Journey: der Sonntag ihrer letzten geplanten
 *  Woche. null, solange sie nicht durchlaufen ist - und ebenso, wenn sie gar
 *  keine Wochen plant (dann gibt es nichts abzuschliessen).
 *
 *  Bewusst nicht der Tag, an dem die App den Abschluss bemerkt: sonst haengt die
 *  Dauer im Archiv davon ab, wann die App zufaellig geoeffnet wurde - zwei
 *  Wochen Urlaub liessen die Journey zwei Wochen laenger aussehen, als sie war
 *  (#240). Weil nur Wochen STRIKT VOR dem Bezugsdatum zaehlen, liegt das
 *  Enddatum immer in der Vergangenheit. */
export function journeyEndDate(
  journey: JourneyLike,
  sessions: JourneySession[],
  freqTarget: number,
  today: string,
): string | null {
  const phases = journey.phases || [];
  const total = totalJourneyWeeks(phases);
  if (total <= 0) return null;
  const weeks = fulfilledWeeks(sessions, journey.id, freqTarget, phases);
  if (weeks.before(isoWeekKey(today)) < total) return null;
  return weeks.sundayOf(total) || null;
}

// Fortschritt der Kalenderwoche, in der dateStr liegt: gezaehlte Einheiten,
// Frequenzziel und ob erfuellt. Reine Anzahl abgeschlossener Einheiten (kein
// Score), Reihenfolge egal. journeyWeek = globale Journey-Wochennummer dieser KW.
export function weekProgress(
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  dateStr: string,
  phases: readonly PhaseLike[],
): WeekProgress {
  const key = isoWeekKey(dateStr);
  let units = 0;
  countingSessions(sessions, journeyId).forEach((s) => {
    if (isoWeekKey(s.date) === key) units++;
  });
  const target = Math.max(1, freqTarget || 1);
  const weeks = fulfilledWeeks(sessions, journeyId, target, phases);
  return {
    isoKey: key,
    weekNum: isoWeekNumOf(key),
    units,
    target,
    // Eine Woche ohne Vorgabe ist erfuellt, ohne dass etwas passiert - die
    // Einheitenzahl bleibt dabei die tatsaechliche (nichts wird dazugezaehlt).
    fulfilled: weeks.has(key),
    journeyWeek: weeks.before(key) + 1,
  };
}
