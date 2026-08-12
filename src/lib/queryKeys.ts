// Alle Query-Schluessel des Zwischenspeichers (TanStack Query) und die
// Auffrisch-Gruppen je Schreib-Ereignis an einer Stelle.
//
// Zwei Teile, zwei Aufgaben:
//
// 1. `queryKeys` baut den vollstaendigen Schluessel je Entitaet. Nutzerbezogene
//    Schluessel verlangen die Nutzer-Kennung als Parameter – sie kann damit nicht
//    mehr vergessen werden, und ein Tippfehler im Namen faellt beim Typecheck auf
//    statt still die Auffrischung ins Leere laufen zu lassen. Die Kennung sitzt
//    immer an zweiter Stelle, damit beim Kontowechsel nichts gemischt wird.
//
// 2. `INVALIDATE` nennt je Schreib-Ereignis die aufzufrischenden Wurzeln. Der
//    Schreiber nennt das Ereignis ("Kraft-Einheit beendet"), nicht die Schluessel.
//    Bewusst nur Wurzeln ohne Nutzer-Kennung: TanStack Query vergleicht nach
//    Praefix, `["sessions"]` trifft also `["sessions", <Kennung>]` mit. Damit
//    gibt es genau eine Schreibweise fuers Auffrischen statt der frueheren
//    Mischung aus mal mit, mal ohne Kennung.
//
// Abgeleitete Ansichten (`useTrainingOverview`, `useCoachStatuses`) haben bewusst
// keinen eigenen Schluessel: sie rechnen im Speicher aus den Hooks unten und
// aktualisieren sich, sobald eine ihrer Quellen aufgefrischt wird. Sie tauchen
// deshalb in keiner Gruppe auf.
//
// Reines Werte-Modul ohne Laufzeit-Abhaengigkeit in die App (nur der QueryClient
// als Typ), damit es von Hooks, Komponenten und den Mutations-Registrierungen
// gleichermassen benutzt werden kann.

import type { QueryClient } from "@tanstack/react-query";

/** Nutzer-Kennung wie `useUserId` sie liefert: null, solange keine Sitzung steht. */
export type UserId = string | null;

/** Wurzelname je Zwischenspeicher-Eintrag. Diese Zeichenketten sind der einzige
 *  Ort, an dem ein Schluesselname ausgeschrieben steht. */
export const QUERY_ROOTS = {
  exercises: "exercises",
  exerciseMuscles: "exercise_muscles",
  sessions: "sessions",
  sessionsDetailed: "sessions-detailed",
  activeJourney: "activeJourney",
  archivedJourney: "archivedJourney",
  archivedJourneys: "archivedJourneys",
  journeyWorkouts: "journeyWorkouts",
  journeyTemplates: "journeyTemplates",
  templates: "templates",
  settings: "settings",
  skills: "skills",
  skillProgress: "skillProgress",
  milestones: "milestones",
  rmTests: "rmTests",
  zeitraeume: "zeitraeume",
  composition: "composition",
  compMilestones: "compMilestones",
  latestBody: "latestBody",
  bodyLog: "body-log",
  equipment: "equipment",
  ownedEquipment: "ownedEquipment",
  bars: "bars",
  plates: "plates",
  kettlebells: "kettlebells",
  dumbbells: "dumbbells",
  changelog: "changelog",
  changelogAll: "changelog-all",
  appVersion: "app-version",
  verbindung: "verbindung",
} as const;

export type QueryRoot = (typeof QUERY_ROOTS)[keyof typeof QUERY_ROOTS];

/** Vollstaendige Schluessel je Entitaet. Nutzerbezogene Eintraege verlangen die
 *  Kennung, nutzerfreie (Changelog, Version, Verbindungstest) haben keine. */
export const queryKeys = {
  /** Uebungskatalog des Nutzers. */
  exercises: (userId: UserId) => [QUERY_ROOTS.exercises, userId] as const,
  /** Muskelanteile je Uebung. */
  exerciseMuscles: (userId: UserId) =>
    [QUERY_ROOTS.exerciseMuscles, userId] as const,
  /** Einheiten in Kurzform (Liste, Kalender). */
  sessions: (userId: UserId) => [QUERY_ROOTS.sessions, userId] as const,
  /** Einheiten mit Uebungen und Saetzen (Verlauf, Coach). */
  sessionsDetailed: (userId: UserId) =>
    [QUERY_ROOTS.sessionsDetailed, userId] as const,
  /** Laufende Journey samt Phasen. */
  activeJourney: (userId: UserId) =>
    [QUERY_ROOTS.activeJourney, userId] as const,
  /** Liste der abgeschlossenen Journeys. */
  archivedJourneys: (userId: UserId) =>
    [QUERY_ROOTS.archivedJourneys, userId] as const,
  /** Eine abgeschlossene Journey fuer die Rueckschau. */
  archivedJourney: (userId: UserId, journeyId: string | null) =>
    [QUERY_ROOTS.archivedJourney, userId, journeyId] as const,
  /** Workout-Zuweisung einer Journey. */
  journeyWorkouts: (userId: UserId, journeyId: string | null) =>
    [QUERY_ROOTS.journeyWorkouts, userId, journeyId] as const,
  /** Journey-Vorlagen zur Auswahl. */
  journeyTemplates: (userId: UserId) =>
    [QUERY_ROOTS.journeyTemplates, userId] as const,
  /** Workout-Vorlagen des Nutzers. */
  templates: (userId: UserId) => [QUERY_ROOTS.templates, userId] as const,
  /** Einstellungen des Nutzers. */
  settings: (userId: UserId) => [QUERY_ROOTS.settings, userId] as const,
  /** Skill-Definitionen samt Phasen. */
  skills: (userId: UserId) => [QUERY_ROOTS.skills, userId] as const,
  /** Skill-Fortschritt des Nutzers. */
  skillProgress: (userId: UserId) =>
    [QUERY_ROOTS.skillProgress, userId] as const,
  /** Meilensteine einer Uebung. */
  milestones: (userId: UserId, exerciseId: string) =>
    [QUERY_ROOTS.milestones, userId, exerciseId] as const,
  /** 1RM-Tests einer Uebung. */
  rmTests: (userId: UserId, exerciseId: string) =>
    [QUERY_ROOTS.rmTests, userId, exerciseId] as const,
  /** Alle 1RM-Tests (Verlauf, Kalender). */
  rmTestsAll: (userId: UserId) =>
    [QUERY_ROOTS.rmTests, userId, "alle"] as const,
  /** Zeitraeume (Urlaub, Krankheit, Pause). */
  zeitraeume: (userId: UserId) => [QUERY_ROOTS.zeitraeume, userId] as const,
  /** Koerperzusammensetzung (Messungen). */
  composition: (userId: UserId) => [QUERY_ROOTS.composition, userId] as const,
  /** Meilensteine der Koerperzusammensetzung. */
  compMilestones: (userId: UserId) =>
    [QUERY_ROOTS.compMilestones, userId] as const,
  /** Juengste Tagesform. */
  latestBody: (userId: UserId) => [QUERY_ROOTS.latestBody, userId] as const,
  /** Verlauf der Tagesform. */
  bodyLog: (userId: UserId) => [QUERY_ROOTS.bodyLog, userId] as const,
  /** Alle Equipment-Eintraege (Schluessel, Name, aktiv). */
  equipment: (userId: UserId) => [QUERY_ROOTS.equipment, userId] as const,
  /** Schluessel der aktiven Equipment-Eintraege. */
  ownedEquipment: (userId: UserId) =>
    [QUERY_ROOTS.ownedEquipment, userId] as const,
  /** Stangen im Inventar. */
  bars: (userId: UserId) => [QUERY_ROOTS.bars, userId] as const,
  /** Scheiben im Inventar. */
  plates: (userId: UserId) => [QUERY_ROOTS.plates, userId] as const,
  /** Kettlebells im Inventar. */
  kettlebells: (userId: UserId) => [QUERY_ROOTS.kettlebells, userId] as const,
  /** Kurzhanteln im Inventar. */
  dumbbells: (userId: UserId) => [QUERY_ROOTS.dumbbells, userId] as const,
  /** Neuester Changelog-Eintrag fuers "Was ist neu"-Popup. */
  changelog: () => [QUERY_ROOTS.changelog] as const,
  /** Alle Versionen fuer den Versionsverlauf. */
  changelogAll: () => [QUERY_ROOTS.changelogAll] as const,
  /** Aktuelle App-Version im Einstellungen-Panel. */
  appVersion: () => [QUERY_ROOTS.appVersion] as const,
  /** Verbindungstest zur Datenbank. */
  verbindung: () => [QUERY_ROOTS.verbindung] as const,
};

/** Was nach welchem Schreib-Ereignis veraltet ist. Reine Werte – die Schreiber
 *  lesen hier nur nach, welche Wurzeln aufzufrischen sind. */
export const INVALIDATE = {
  /** Kraft-Einheit beendet: Verlauf, Katalog (Arbeitsgewicht/1RM) und – bei
   *  abgeschlossener Journey – Journey plus Archiv. */
  finishStrength: [
    QUERY_ROOTS.sessions,
    QUERY_ROOTS.sessionsDetailed,
    QUERY_ROOTS.exercises,
    QUERY_ROOTS.activeJourney,
    QUERY_ROOTS.archivedJourneys,
  ],
  /** Skill-Einheit beendet: Verlauf und Skill-Fortschritt. */
  finishSkill: [
    QUERY_ROOTS.sessions,
    QUERY_ROOTS.sessionsDetailed,
    QUERY_ROOTS.skillProgress,
  ],
  /** Einheit bearbeitet: Verlauf und Katalog. */
  editSession: [
    QUERY_ROOTS.sessions,
    QUERY_ROOTS.sessionsDetailed,
    QUERY_ROOTS.exercises,
  ],
  /** Einheit geloescht. */
  deleteSession: [QUERY_ROOTS.sessions, QUERY_ROOTS.sessionsDetailed],
  /** Yoga-Einheit nachgetragen. */
  addYoga: [QUERY_ROOTS.sessions, QUERY_ROOTS.sessionsDetailed],
  /** Journey angelegt, gewechselt oder umbenannt – die abgeloeste landet im
   *  Archiv. Der Katalog gehoert dazu: der Journey-Start friert die
   *  Referenzgewichte in `exercises` ein bzw. raeumt sie weg (journeyWrite.ts),
   *  und ohne Auffrischung greift der Lastfaktor in der ersten Einheit nicht. */
  journeyChange: [
    QUERY_ROOTS.activeJourney,
    QUERY_ROOTS.archivedJourneys,
    QUERY_ROOTS.exercises,
  ],
  /** Workout-Zuweisung einer Journey geaendert. */
  journeyWorkouts: [QUERY_ROOTS.journeyWorkouts],
  /** Uebung im Katalog geaendert. */
  exerciseUpdate: [QUERY_ROOTS.exercises],
  /** 1RM-Test erfasst oder geloescht: Testliste und Katalog (1RM zieht nach). */
  rmTest: [QUERY_ROOTS.rmTests, QUERY_ROOTS.exercises],
  /** Skill-Fortschritt geschrieben (Phase weiter, Zaehler, gemeistert). */
  skillProgress: [QUERY_ROOTS.skillProgress],
  /** Einstellungen geaendert. */
  settingsUpdate: [QUERY_ROOTS.settings],
  /** Tagesform erfasst: Verlauf und juengster Eintrag. */
  bodyToday: [QUERY_ROOTS.latestBody, QUERY_ROOTS.bodyLog],
  /** Meilenstein einer Uebung geaendert. */
  milestones: [QUERY_ROOTS.milestones],
  /** Zeitraum angelegt, geaendert oder geloescht. */
  zeitraeume: [QUERY_ROOTS.zeitraeume],
  /** Messung der Koerperzusammensetzung geaendert. */
  composition: [QUERY_ROOTS.composition],
  /** Meilenstein der Koerperzusammensetzung geaendert. */
  compMilestones: [QUERY_ROOTS.compMilestones],
  /** Workout-Vorlage angelegt, geaendert oder geloescht. */
  templates: [QUERY_ROOTS.templates],
  /** Scheiben im Inventar geaendert. */
  plates: [QUERY_ROOTS.plates],
  /** Kettlebells im Inventar geaendert. */
  kettlebells: [QUERY_ROOTS.kettlebells],
  /** Kurzhanteln im Inventar geaendert. */
  dumbbells: [QUERY_ROOTS.dumbbells],
  /** Equipment an- oder abgeschaltet: Liste und abgeleitete Schluesselmenge. */
  equipment: [QUERY_ROOTS.equipment, QUERY_ROOTS.ownedEquipment],
} as const satisfies Record<string, readonly QueryRoot[]>;

/** Eine Auffrisch-Gruppe ausfuehren: je Wurzel ein `invalidateQueries`. Bewusst
 *  ohne await – das Auffrischen laeuft im Hintergrund, der Schreibvorgang gilt
 *  auch offline als erledigt. */
export function invalidateGroup(
  qc: QueryClient,
  group: readonly QueryRoot[],
): void {
  for (const root of group) {
    void qc.invalidateQueries({ queryKey: [root] });
  }
}
