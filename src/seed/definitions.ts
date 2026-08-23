// Definitionsdaten der Erstbefuellung. Diese stehen bewusst im Code (nicht im
// V1-Datenexport) und werden beim ersten Start in die Datenbank geseedet:
// die Bausteine der Phasen, die kuratierten Journey-Vorlagen und die
// Skill-Progressionen. Vorlagen und Skills 1:1 aus V1 (data.js:
// JOURNEY_TEMPLATES und SKILLS).

import type {
  Focus,
  LoadBuilder,
  Metric,
  PhaseControl,
  PhaseTypeKey,
  PlanBuilder,
} from "@/schemas";

// --- Bausteine der Phasen -----------------------------------------------------

/**
 * Ein Baustein (phase_types): womit eine Phase dieses Typs anfaengt und was
 * daran einstellbar ist. Die Bauregeln (`planBuilder`, `loadBuilder`) werden nur
 * beim Namen genannt - die Rechnung dazu steht im Code.
 *
 * Werte 1:1 aus docs/Konzept-Bausteine-Datenstruktur.md (Abschnitte 4 und 5) und
 * deckungsgleich mit supabase/migrations/0043_bausteine_phasentypen.sql, die sie
 * fuer bestehende Nutzer nachzieht.
 */
export interface SeedPhaseType {
  key: PhaseTypeKey;
  name: string;
  summary: string;
  control: PhaseControl;
  planBuilder: PlanBuilder | null;
  loadBuilder: LoadBuilder | null;
  /** Vorsichtige Steigerung des Coaches. */
  careful: boolean;
  weeksMin: number;
  weeksMax: number;
  weeksDefault: number;
  setsStartDefault: number;
  setsEndDefault: number;
  setsMax: number;
  /** true = die Saetze kommen aus der Wochenliste. */
  setsLocked: boolean;
  /** null = die Uebung behaelt ihr eigenes Band. */
  repMinDefault: number | null;
  repMaxDefault: number | null;
  /** Korridor, in dem das Band verstellt werden darf. */
  repBoundMin: number | null;
  repBoundMax: number | null;
  /** true = das Band hat in diesem Steuerweg keine Wirkung (ADR-0018). */
  repBandLocked: boolean;
  deloadAllowed: boolean;
  deloadDefault: number | null;
  loadStartDefault: number | null;
  loadEndDefault: number | null;
  /** Reiner Hinweistext, ohne jede Wirkung. */
  placementHint: string | null;
}

export const phaseTypeSeeds: SeedPhaseType[] = [
  {
    key: "endurance",
    name: "Kraftausdauer",
    summary:
      "Viele Wiederholungen bei moderatem Gewicht: baut Kapazität und Durchhaltevermögen auf, ohne schwer zu werden.",
    control: "coach",
    planBuilder: null,
    loadBuilder: null,
    careful: false,
    weeksMin: 3,
    weeksMax: 8,
    weeksDefault: 4,
    setsStartDefault: 2,
    setsEndDefault: 4,
    setsMax: 6,
    setsLocked: false,
    repMinDefault: 12,
    repMaxDefault: 18,
    repBoundMin: 10,
    repBoundMax: 25,
    repBandLocked: false,
    deloadAllowed: true,
    // Woche 3 von vier: eine Entlastung darf nie die letzte Phasenwoche sein.
    deloadDefault: 3,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "hypertrophy",
    name: "Hypertrophie",
    summary:
      "Muskelaufbau über das Volumen: mittleres Wiederholungsband, die Satzzahl steigt über die Wochen.",
    control: "coach",
    planBuilder: null,
    loadBuilder: null,
    careful: false,
    weeksMin: 3,
    weeksMax: 8,
    weeksDefault: 5,
    setsStartDefault: 2,
    setsEndDefault: 6,
    setsMax: 8,
    setsLocked: false,
    repMinDefault: 8,
    repMaxDefault: 12,
    repBoundMin: 6,
    repBoundMax: 15,
    repBandLocked: false,
    deloadAllowed: true,
    deloadDefault: 4,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "reentry",
    name: "Wiedereinstieg",
    summary:
      "Vorsichtiger Start nach einer Pause: wenige Sätze, und gesteigert wird nur, wenn die letzte Einheit leicht und schmerzfrei war.",
    control: "coach",
    planBuilder: null,
    loadBuilder: null,
    careful: true,
    weeksMin: 1,
    weeksMax: 4,
    weeksDefault: 2,
    setsStartDefault: 2,
    setsEndDefault: 2,
    setsMax: 3,
    setsLocked: false,
    repMinDefault: 5,
    repMaxDefault: 8,
    repBoundMin: 5,
    repBoundMax: 12,
    repBandLocked: false,
    deloadAllowed: false,
    deloadDefault: null,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "maintenance",
    name: "Erhaltung",
    summary:
      "Hält das Erreichte mit wenig Aufwand: niedrige Satzzahl, und jede Übung behält ihr eigenes Wiederholungsband.",
    control: "coach",
    planBuilder: null,
    loadBuilder: null,
    careful: false,
    weeksMin: 1,
    weeksMax: 12,
    weeksDefault: 3,
    setsStartDefault: 3,
    setsEndDefault: 3,
    setsMax: 5,
    setsLocked: false,
    // Ohne Vorgabeband gibt es auch keinen Korridor.
    repMinDefault: null,
    repMaxDefault: null,
    repBoundMin: null,
    repBoundMax: null,
    repBandLocked: false,
    // Bei bis zu zwoelf Wochen Laufzeit waere ein Verbot zu streng.
    deloadAllowed: true,
    deloadDefault: null,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "strength",
    name: "Maximalkraft",
    summary:
      "Schwere Wochenleiter mit fester Satzzahl: das Gewicht steigt Woche für Woche, die Wiederholungen gehen zurück.",
    control: "plan",
    planBuilder: "strength_ladder",
    loadBuilder: null,
    careful: false,
    weeksMin: 3,
    weeksMax: 6,
    weeksDefault: 5,
    setsStartDefault: 4,
    setsEndDefault: 4,
    setsMax: 4,
    setsLocked: true,
    repMinDefault: 4,
    repMaxDefault: 6,
    repBoundMin: null,
    repBoundMax: null,
    repBandLocked: true,
    deloadAllowed: false,
    deloadDefault: null,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "power",
    name: "Intensivierung",
    summary:
      "Kurz und schwer nach einer Kraftphase: eine eigene, steilere Leiter bis in den Einzelversuch.",
    control: "plan",
    planBuilder: "power_ladder",
    loadBuilder: null,
    careful: false,
    weeksMin: 3,
    weeksMax: 4,
    weeksDefault: 3,
    setsStartDefault: 4,
    setsEndDefault: 4,
    setsMax: 4,
    setsLocked: true,
    repMinDefault: 3,
    repMaxDefault: 5,
    repBoundMin: null,
    repBoundMax: null,
    repBandLocked: true,
    deloadAllowed: false,
    deloadDefault: null,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "test",
    name: "Test/Peak",
    summary:
      "Ausgeruht messen: eine Entlastung stellt frei, danach wird das Maximum getestet.",
    control: "plan",
    planBuilder: "test",
    loadBuilder: null,
    careful: false,
    weeksMin: 1,
    weeksMax: 2,
    weeksDefault: 2,
    setsStartDefault: 2,
    setsEndDefault: 2,
    setsMax: 2,
    setsLocked: true,
    repMinDefault: 2,
    repMaxDefault: 4,
    repBoundMin: null,
    repBoundMax: null,
    repBandLocked: true,
    // Die Entlastung steckt in der Bauregel der Testphase.
    deloadAllowed: false,
    deloadDefault: null,
    loadStartDefault: null,
    loadEndDefault: null,
    placementHint: null,
  },
  {
    key: "rebuild",
    name: "Wiederaufbau",
    summary:
      "Zurück auf das Niveau vor der Pause: die Phase gibt das Gewicht Woche für Woche vor, von 65 auf 95 Prozent des Referenzgewichts.",
    // Der einzige gemischte Baustein: die Last kommt aus der Liste, Saetze und
    // Wiederholungen bleiben beim Coach.
    control: "coach",
    planBuilder: null,
    loadBuilder: "rebuild_ramp",
    careful: true,
    weeksMin: 3,
    weeksMax: 6,
    weeksDefault: 3,
    setsStartDefault: 2,
    setsEndDefault: 4,
    setsMax: 6,
    setsLocked: false,
    repMinDefault: 6,
    repMaxDefault: 10,
    repBoundMin: 5,
    repBoundMax: 15,
    repBandLocked: false,
    // Der Block ist bereits die Entlastung.
    deloadAllowed: false,
    deloadDefault: null,
    loadStartDefault: 0.65,
    loadEndDefault: 0.95,
    placementHint:
      "Gehört an den Anfang der Journey – später gesetzt zieht er auf ein Niveau von vor mehreren Wochen zurück.",
  },
];

// --- Journey-Vorlagen ---------------------------------------------------------

/**
 * Phase einer Journey-Vorlage. Der Wochenplan (week_plan) steht hier bewusst
 * nicht: er faellt eindeutig aus Fokus und Phasenlaenge und wird beim Seeden
 * ueber `buildWeekPlan` (engine/weekPlan.ts) gerechnet - so gibt es nur eine
 * Pflegequelle fuer die Leiter. Kraftphasen haben keine Entlastungswoche mehr
 * (deloadWeek null); die Entlastung steht am Anfang der Testphase.
 */
export interface SeedJourneyPhase {
  name: string;
  focus: Focus;
  weeks: number;
  setsStart: number;
  setsEnd: number;
  deloadWeek: number | null;
  repTargetMin: number;
  repTargetMax: number;
  /**
   * Anteil des Referenzgewichts, mit dem in dieser Phase gearbeitet wird.
   * 1.0 = volles Niveau, der Coach bestimmt das Gewicht wie gewohnt aus der
   * letzten Leistung. Werte unter 1.0 gibt nur der "Wiederaufbau nach Fasten"
   * vor, dort steuert die Journey das Gewicht.
   */
  loadFactor: number;
}

export interface SeedJourneyTemplate {
  key: string;
  name: string;
  tagline: string;
  forWhom: string;
  summary: string;
  phases: SeedJourneyPhase[];
}

export const journeyTemplateSeeds: SeedJourneyTemplate[] = [
  {
    key: "reentry_build",
    name: "Wiedereinstieg & Aufbau",
    tagline: "Sauber zurück und systematisch zu mehr Kraft",
    forWhom:
      "Nach Pause, Verletzung oder als Einstieg ins strukturierte Langhanteltraining.",
    summary:
      "Beginnt bewusst leicht, um Technik und Belastbarkeit aufzubauen, steigert dann Volumen für Muskelaufbau, schaltet auf Maximalkraft um und schließt mit einer Testwoche für neue Bestwerte.",
    phases: [
      { name: "Wiedereinstieg", focus: "reentry", weeks: 2, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 5, repTargetMax: 8, loadFactor: 1 },
      { name: "Hypertrophie", focus: "hypertrophy", weeks: 5, setsStart: 2, setsEnd: 6, deloadWeek: 4, repTargetMin: 8, repTargetMax: 12, loadFactor: 1 },
      { name: "Maximalkraft", focus: "strength", weeks: 5, setsStart: 4, setsEnd: 4, deloadWeek: null, repTargetMin: 4, repTargetMax: 6, loadFactor: 1 },
      { name: "Übergang / Test", focus: "test", weeks: 2, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 2, repTargetMax: 4, loadFactor: 1 },
    ],
  },
  {
    key: "refeed_rebuild",
    name: "Wiederaufbau nach Fasten",
    tagline: "In vier Wochen zurück auf das Niveau vor der Pause",
    forWhom:
      "Nach Fastenwoche, Krankheit oder kurzer Trainingspause, wenn die Kraft noch da ist, die ersten Einheiten aber nicht überziehen sollen.",
    summary:
      "Diese Journey gibt das Gewicht selbst vor: In den ersten drei Wochen trainierst du mit 65, 80 und 95 Prozent des Gewichts von vor der Pause. Der Coach darf in dieser Zeit nicht darüber hinausgehen und steuert nur die Wiederholungen; nach unten reagiert er wie gewohnt, wenn Schmerz oder schlechte Erholung dazwischenkommen. Ab Woche vier bist du wieder beim alten Gewicht und der Coach arbeitet wieder normal. Bei allen anderen Vorlagen bestimmt er das Gewicht aus deiner letzten Leistung.",
    phases: [
      { name: "Tasten", focus: "reentry", weeks: 1, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 8, repTargetMax: 10, loadFactor: 0.65 },
      { name: "Reaktivieren", focus: "reentry", weeks: 1, setsStart: 3, setsEnd: 3, deloadWeek: null, repTargetMin: 6, repTargetMax: 10, loadFactor: 0.8 },
      { name: "Anschluss", focus: "hypertrophy", weeks: 1, setsStart: 3, setsEnd: 4, deloadWeek: null, repTargetMin: 6, repTargetMax: 10, loadFactor: 0.95 },
      { name: "Standort", focus: "test", weeks: 1, setsStart: 2, setsEnd: 3, deloadWeek: null, repTargetMin: 3, repTargetMax: 6, loadFactor: 1 },
    ],
  },
];

// --- Skills -------------------------------------------------------------------

export interface SeedSkillExercise {
  name: string;
  metric: Metric;
  sets: number;
  target: number;
  tempo: string | null;
  // V1-Schluessel der verknuepften Katalog-Uebung. Beim Seed bleibt der DB-Link
  // (exercise_id) noch leer; er wird spaeter ueber diesen Schluessel gesetzt,
  // sobald die Uebungen importiert sind (Feature-Phasen).
  exerciseKey: string | null;
}

export interface SeedSkillPhase {
  label: string;
  description: string;
  consecutiveSessions: number;
  equipment: string[];
  exercises: SeedSkillExercise[];
}

export interface SeedSkill {
  key: string;
  name: string;
  category: string;
  image: string | null;
  phases: SeedSkillPhase[];
}

export const skillSeeds: SeedSkill[] = [
  {
    key: "strict_pullup",
    name: "Strict Pull-Up",
    category: "gymnastics",
    image: "Strict_pull_up.jpeg",
    phases: [
      {
        label: "Grundspannung",
        description: "Dead Hang und Skapula-Kontrolle aufbauen.",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Dead Hang", metric: "duration", sets: 3, target: 30, tempo: null, exerciseKey: "dead_hang" },
          { name: "Scapular Pull-Up", metric: "reps", sets: 3, target: 5, tempo: null, exerciseKey: "scapular_pullup" },
        ],
      },
      {
        label: "Band stark",
        description: "",
        consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-heavy"],
        exercises: [
          { name: "Band Pull-Up (stark)", metric: "reps", sets: 3, target: 6, tempo: null, exerciseKey: "band_pullup" },
        ],
      },
      {
        label: "Band mittel",
        description: "",
        consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-medium"],
        exercises: [
          { name: "Band Pull-Up (mittel)", metric: "reps", sets: 3, target: 6, tempo: null, exerciseKey: "band_pullup" },
        ],
      },
      {
        label: "Band leicht",
        description: "",
        consecutiveSessions: 2,
        equipment: ["pullup-bar", "band-light"],
        exercises: [
          { name: "Band Pull-Up (leicht)", metric: "reps", sets: 3, target: 8, tempo: null, exerciseKey: "band_pullup" },
        ],
      },
      {
        label: "Negativs",
        description: "Sauber und langsam ablassen, Spannung halten.",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Negative Pull-Up", metric: "reps", sets: 3, target: 5, tempo: "5 Sek. ablassen", exerciseKey: "negative_pullup" },
        ],
      },
      {
        label: "Baby-Klimmzüge",
        description: "Erste freie Klimmzüge — sauber aus dem Hang, ohne Schwung.",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Strict Pull-Up", metric: "reps", sets: 1, target: 3, tempo: null, exerciseKey: "strict_pullup" },
        ],
      },
      {
        label: "Junge Klimmzüge",
        description: "",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Strict Pull-Up", metric: "reps", sets: 3, target: 3, tempo: null, exerciseKey: "strict_pullup" },
        ],
      },
      {
        label: "Meister-Klimmzüge",
        description: "",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Strict Pull-Up", metric: "reps", sets: 6, target: 3, tempo: null, exerciseKey: "strict_pullup" },
        ],
      },
      {
        label: "Hero-Klimmzüge",
        description: "",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Strict Pull-Up", metric: "reps", sets: 9, target: 3, tempo: null, exerciseKey: "strict_pullup" },
        ],
      },
      {
        label: "Traum-Klimmzüge",
        description: "12×3 strenge Klimmzüge — das Ziel.",
        consecutiveSessions: 2,
        equipment: ["pullup-bar"],
        exercises: [
          { name: "Strict Pull-Up", metric: "reps", sets: 12, target: 3, tempo: null, exerciseKey: "strict_pullup" },
        ],
      },
    ],
  },
  {
    key: "pushup",
    name: "Pushup",
    category: "gymnastics",
    image: "Pushup.jpeg",
    phases: [
      {
        label: "Knie-Liegestütze",
        description: "",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Knee Push-Up", metric: "reps", sets: 3, target: 10, tempo: null, exerciseKey: "knee_pushup" },
        ],
      },
      {
        label: "Hände erhöht",
        description: "",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Incline Push-Up", metric: "reps", sets: 3, target: 10, tempo: null, exerciseKey: "incline_pushup" },
        ],
      },
      {
        label: "Volle Liegestütze",
        description: "",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Full Push-Up", metric: "reps", sets: 3, target: 12, tempo: null, exerciseKey: "full_pushup" },
        ],
      },
      {
        label: "Mehr Volumen",
        description: "",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Full Push-Up", metric: "reps", sets: 3, target: 18, tempo: null, exerciseKey: "full_pushup" },
        ],
      },
      {
        label: "Hohes Volumen",
        description: "",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Full Push-Up", metric: "reps", sets: 3, target: 26, tempo: null, exerciseKey: "full_pushup" },
        ],
      },
      {
        label: "Ziel: 35 saubere",
        description: "",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Full Push-Up", metric: "reps", sets: 3, target: 35, tempo: null, exerciseKey: "full_pushup" },
        ],
      },
    ],
  },
  {
    key: "plank",
    name: "Plank",
    category: "core",
    image: null,
    phases: [
      {
        label: "Spanplatte",
        description:
          "Der klassische Unterarmstütz: Ellenbogen unter den Schultern, Körper eine gerade Linie, Blick nach unten.",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Plank", metric: "duration", sets: 1, target: 60, tempo: null, exerciseKey: "plank" },
        ],
      },
      {
        label: "Eichenbrett",
        description: "Zwei Minuten ohne durchhängende Hüfte.",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Plank", metric: "duration", sets: 1, target: 120, tempo: null, exerciseKey: "plank" },
        ],
      },
      {
        label: "Stahlträger",
        description: "Fünf Minuten am Stück. Ab hier hält der Kopf mit.",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Plank", metric: "duration", sets: 1, target: 300, tempo: null, exerciseKey: "plank" },
        ],
      },
      {
        label: "Betonplatte",
        description: "Zehn Minuten. Sobald die Hüfte absackt, sofort abbrechen.",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Plank", metric: "duration", sets: 1, target: 600, tempo: null, exerciseKey: "plank" },
        ],
      },
      {
        label: "Monolith",
        description: "Eine Viertelstunde unbeweglich. Endstufe.",
        consecutiveSessions: 2,
        equipment: [],
        exercises: [
          { name: "Plank", metric: "duration", sets: 1, target: 900, tempo: null, exerciseKey: "plank" },
        ],
      },
    ],
  },
];

// --- Equipment (Skill-Tor) ----------------------------------------------------

export interface SeedEquipment {
  key: string;
  label: string;
  active: boolean;
}

// Standard-Geraete fuer das Skill-Equipment-Tor. Beim ersten Start angelegt;
// die Auswahl (active) ist spaeter in den Einstellungen anpassbar (Phase 10).
// Schluessel muessen zu den equipment-Referenzen der Skill-Phasen passen.
export const equipmentSeeds: SeedEquipment[] = [
  { key: "band-heavy", label: "Band stark", active: true },
  { key: "band-medium", label: "Band mittel", active: true },
  { key: "band-light", label: "Band leicht", active: false },
  { key: "pullup-bar", label: "Klimmzugstange", active: true },
  { key: "rings", label: "Ringe", active: false },
  { key: "parallettes", label: "Parallettes", active: false },
];
