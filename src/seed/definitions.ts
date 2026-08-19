// Definitionsdaten der Erstbefuellung. Diese stehen bewusst im Code (nicht im
// V1-Datenexport) und werden beim ersten Start in die Datenbank geseedet:
// die kuratierten Journey-Vorlagen und die Skill-Progressionen. Inhalte 1:1 aus
// V1 (data.js: JOURNEY_TEMPLATES und SKILLS).

import type { Focus, Metric } from "@/schemas";

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
