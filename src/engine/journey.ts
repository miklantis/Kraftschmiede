// Journey-Platzierung: leitet aus dem Trainingsverlauf ab, in welcher Phase und
// Woche die aktive Journey gerade steht, und wie weit die laufende Kalenderwoche
// erfuellt ist. Reine Funktionen ohne DB-/DOM-Bezug; der Aufrufer reicht Sessions,
// Phasen, Frequenzziel und das Bezugsdatum herein (1:1 aus V1 portiert).
//
// Grundidee: eine Journey-Woche gilt als erfuellt, wenn in ihr mindestens
// freqTarget zaehlende Einheiten liegen. Phase und Woche-in-Phase werden daraus
// abgeleitet, nicht von Hand gesetzt. Keine Pausenlogik: eine Woche ohne genug
// Einheiten zaehlt einfach nicht und schiebt nichts.
//
// Eine Ausnahme: liegt in der Woche ein abgeschlossener 1RM-Test, ist sie
// erfuellt - unabhaengig von der Einheitenzahl. Die Kombiwoche der Testphase hat
// planmaessig nur zwei Einheiten (Entlastung und Test), die Journey wuerde dort
// sonst haengen bleiben (#229). Die Testdaten reicht der Aufrufer als testDates
// herein (aus rm_tests); ohne sie rechnet alles wie bisher.

// Minimal benoetigte Session-Form. Die datenbeschaffende Schicht mappt die
// snake_case-DB-Zeilen (journey_id) auf diese Engine-Form (journeyId).
export interface JourneySession {
  date: string;
  status: string;
  type: string;
  journeyId: string | null;
}

// Phase, soweit die Platzierung sie braucht (Id + Wochenzahl).
export interface PhaseLike {
  id: string;
  weeks: number;
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

// Ziel-Repband eines Phasen-Fokus (1:1 aus V1 repTargetForFocus). maintenance
// und Unbekanntes liefern null -> die Uebung behaelt ihr eigenes Repband.
export function repTargetForFocus(focus: string): [number, number] | null {
  switch (focus) {
    case "reentry":
      return [5, 8];
    case "hypertrophy":
      return [8, 12];
    case "strength":
      return [4, 6];
    case "power":
      return [3, 5];
    case "endurance":
      return [12, 18];
    case "test":
      return [2, 4];
    default:
      return null; // maintenance/unbekannt
  }
}

// Repband einer konkreten Phase: vorrangig die explizit gesetzten Grenzen, sonst
// aus dem Fokus abgeleitet. null = kein Phasen-Repband (Uebung bestimmt selbst).
export function phaseRepBand(
  repTargetMin: number | null,
  repTargetMax: number | null,
  focus: string,
): [number, number] | null {
  if (repTargetMin != null && repTargetMax != null) {
    return [repTargetMin, repTargetMax];
  }
  return repTargetForFocus(focus);
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

// ISO-8601-Wochenschluessel "YYYY-Www" zu einem Datum "YYYY-MM-DD". Feste Breite,
// daher entspricht der lexikografische Vergleich der chronologischen Reihenfolge.
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
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

// Wochen mit einem abgeschlossenen 1RM-Test. Sie gelten als erfuellt, egal wie
// viele Einheiten in ihnen liegen: die Kombiwoche der Testphase hat planmaessig
// nur zwei (Entlastung und Test), das Wochenziel sind drei - ohne diese Regel
// bliebe die Journey dort haengen (#229).
//
// Gezaehlt werden nur Tests ab der ersten Einheit der Journey. Ein Test von
// davor gehoert nicht zu ihr und wuerde die Journey sonst rueckwirkend
// vorruecken.
function testWeekKeys(
  sessions: JourneySession[],
  journeyId: string,
  testDates: readonly string[] | undefined,
): Record<string, true> {
  const out: Record<string, true> = {};
  if (!testDates || testDates.length === 0) return out;
  const counting = countingSessions(sessions, journeyId);
  if (!counting.length) return out;
  let firstKey = isoWeekKey(counting[0].date);
  for (const s of counting) {
    const k = isoWeekKey(s.date);
    if (k < firstKey) firstKey = k;
  }
  for (const d of testDates) {
    if (!d) continue;
    const k = isoWeekKey(d);
    if (k >= firstKey) out[k] = true;
  }
  return out;
}

// Set-artiges Objekt der erfuellten Wochenschluessel: >= freqTarget Einheiten
// oder ein 1RM-Test in der Woche (Kombiwoche, s. testWeekKeys).
function fulfilledWeekKeys(
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  testDates?: readonly string[],
): Record<string, true> {
  const counts: Record<string, number> = {};
  countingSessions(sessions, journeyId).forEach((s) => {
    const k = isoWeekKey(s.date);
    counts[k] = (counts[k] || 0) + 1;
  });
  const out: Record<string, true> = testWeekKeys(sessions, journeyId, testDates);
  Object.keys(counts).forEach((k) => {
    if (counts[k] >= freqTarget) out[k] = true;
  });
  return out;
}

// Journey-Wochennummer (1-basiert) der Kalenderwoche, in der dateStr liegt:
// erfuellte Wochen STRIKT VOR dieser Woche + 1. Die laufende Woche behaelt ihre
// Nummer Mo–So und wird erst rueckwirkend erfuellt.
export function journeyWeekForDate(
  dateStr: string,
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  testDates?: readonly string[],
): number {
  const key = isoWeekKey(dateStr);
  const ful = fulfilledWeekKeys(sessions, journeyId, freqTarget, testDates);
  let before = 0;
  Object.keys(ful).forEach((k) => {
    if (k < key) before++;
  });
  return before + 1;
}

/** Nachschlage-Funktion Datum -> Journey-Wochennummer. Gleiche Rechnung wie
 *  journeyWeekForDate, aber die erfuellten Wochen werden nur einmal bestimmt -
 *  gedacht fuer Aufrufer, die viele Einheiten einsortieren muessen (z. B. „letzte
 *  Einheit dieser Uebung in der Vorwoche"). */
export function journeyWeekLookup(
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  testDates?: readonly string[],
): (dateStr: string) => number {
  const keys = Object.keys(
    fulfilledWeekKeys(sessions, journeyId, freqTarget, testDates),
  ).sort();
  return (dateStr: string): number => {
    const key = isoWeekKey(dateStr);
    let before = 0;
    for (const k of keys) {
      if (k < key) before++;
      else break;
    }
    return before + 1;
  };
}

// Mapping globale Wochennummer -> Phase + Woche-in-Phase. globalWeek groesser als
// die Summe aller Phasenwochen => done:true (Journey durchlaufen).
export function phasePlacement(
  phases: PhaseLike[],
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
  testDates?: readonly string[],
): Placement {
  const gw = journeyWeekForDate(today, sessions, journey.id, freqTarget, testDates);
  const p = phasePlacement(journey.phases || [], gw);
  return { ...p, globalWeek: gw };
}

// Summe aller Phasenwochen einer Journey = geplante Gesamtdauer in Wochen.
export function totalJourneyWeeks(phases: PhaseLike[]): number {
  return (phases || []).reduce((sum, p) => sum + (p.weeks || 0), 0);
}

// Schliesst die neue Einheit die Journey ab? Wahr, wenn die Einheit in der
// letzten geplanten Journey-Woche (oder darueber hinaus) liegt UND mit ihr das
// Wochen-Pensum dieser Kalenderwoche erfuellt ist.
//
// `sessionsBefore` enthaelt den Verlauf OHNE die gerade beendete Einheit; deren
// Datum kommt als `date`. Die Journey-Wochennummer zaehlt nur Wochen STRIKT VOR
// der laufenden, ist also unabhaengig davon, ob die neue Einheit schon
// mitgezaehlt wird. Das ">= Gesamtwochen" faengt zugleich Journeys ab, die
// laengst ueberfaellig sind: sie schliessen mit der naechsten erfuellten Woche.
export function completesJourney(
  journey: JourneyLike,
  sessionsBefore: JourneySession[],
  freqTarget: number,
  date: string,
  testDates?: readonly string[],
): boolean {
  const total = totalJourneyWeeks(journey.phases || []);
  if (total <= 0) return false;
  const target = Math.max(1, freqTarget || 1);
  const week = journeyWeekForDate(date, sessionsBefore, journey.id, target, testDates);
  if (week < total) return false;
  const wp = weekProgress(sessionsBefore, journey.id, target, date, testDates);
  // Liegt in der Woche schon ein 1RM-Test, ist sie ohnehin erfuellt - dann
  // schliesst diese Einheit die Journey ab, auch ohne das volle Pensum.
  return wp.fulfilled || wp.units + 1 >= target;
}

// Fortschritt der Kalenderwoche, in der dateStr liegt: gezaehlte Einheiten,
// Frequenzziel und ob erfuellt. Reine Anzahl abgeschlossener Einheiten (kein
// Score), Reihenfolge egal. journeyWeek = globale Journey-Wochennummer dieser KW.
export function weekProgress(
  sessions: JourneySession[],
  journeyId: string,
  freqTarget: number,
  dateStr: string,
  testDates?: readonly string[],
): WeekProgress {
  const key = isoWeekKey(dateStr);
  let units = 0;
  countingSessions(sessions, journeyId).forEach((s) => {
    if (isoWeekKey(s.date) === key) units++;
  });
  const target = Math.max(1, freqTarget || 1);
  // Ein 1RM-Test in der Woche erfuellt sie fuer sich - die Einheitenzahl bleibt
  // aber die tatsaechliche (die Anzeige zaehlt keine Einheit dazu).
  const hasTest = testWeekKeys(sessions, journeyId, testDates)[key] === true;
  return {
    isoKey: key,
    weekNum: isoWeekNumOf(key),
    units,
    target,
    fulfilled: hasTest || units >= target,
    journeyWeek: journeyWeekForDate(dateStr, sessions, journeyId, target, testDates),
  };
}
