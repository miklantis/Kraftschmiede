// Definitionsdaten der Erstbefuellung. Diese stehen bewusst im Code (nicht im
// V1-Datenexport) und werden beim ersten Start in die Datenbank geseedet:
// die Bausteine der Phasen, die kuratierten Journey-Vorlagen und die
// Skill-Progressionen. Vorlagen und Skills 1:1 aus V1 (data.js:
// JOURNEY_TEMPLATES und SKILLS).

import {
  buildPhaseFromType,
  type BuiltPhase,
  type PhaseAdjustments,
} from "@/engine/phaseBuild";
import type {
  ExerciseEquipment,
  ExerciseProfile,
  ExerciseTier,
  Focus,
  LoadBuilder,
  Metric,
  MuscleKategorie,
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
 * Phase einer Journey-Vorlage – als Baustein plus Abweichungen.
 *
 * Getippte Zahlen stehen hier nur noch, wo eine Phase bewusst von den Vorgaben
 * ihres Bausteins abweicht. Alles andere (Wochen, Saetze, Band, Entlastung,
 * Wochenliste, Lastliste, Bauart, vorsichtige Steigerung) kommt aus
 * `phaseTypeSeeds` und wird beim Seeden ueber `buildPhaseFromType` gebaut – so
 * gibt es nur eine Pflegequelle. Ohne eigenen Namen traegt die Phase den Namen
 * ihres Bausteins.
 */
export interface SeedJourneyPhase extends PhaseAdjustments {
  /** Baustein-Schluessel; wandert unveraendert in `phases.focus`. */
  type: Focus;
}

export interface SeedJourneyTemplate {
  key: string;
  name: string;
  tagline: string;
  forWhom: string;
  summary: string;
  phases: SeedJourneyPhase[];
}

/** Baustein zu einem Schluessel. Wirft, statt still ein Loch zu lassen: ein
 *  unbekannter Schluessel im Seed ist ein Fehler, kein Sonderfall. */
export function phaseTypeByKey(key: PhaseTypeKey): SeedPhaseType {
  const treffer = phaseTypeSeeds.find((t) => t.key === key);
  if (treffer === undefined) {
    throw new Error(`Unbekannter Baustein: ${key}`);
  }
  return treffer;
}

/** Vorlagen-Phase zu einer fertigen Phasenzeile bauen. Einzige Stelle, an der
 *  aus dem Seed eine Phase entsteht – Vorlagen-Seed und Test lesen dieselbe. */
export function buildSeedPhase(phase: SeedJourneyPhase): BuiltPhase {
  const { type, ...anpassungen } = phase;
  return buildPhaseFromType(phaseTypeByKey(type), anpassungen);
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
    // Vier Bausteine ohne eine einzige Abweichung: diese Vorlage trifft die
    // Vorgabewerte Feld fuer Feld. Das ist zugleich der Beweis, dass die
    // Bausteine die heutige Welt vollstaendig beschreiben (Konzept Abschnitt 9).
    phases: [
      { type: "reentry" },
      { type: "hypertrophy" },
      { type: "strength" },
      { type: "test" },
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
    // Zwei Bausteine statt vier getippter Wochenphasen (Konzept Abschnitt 9):
    // Der Wiederaufbau-Block traegt die Rampe 65/80/95 ueber seine drei Wochen
    // selbst, danach misst eine Testwoche den Stand. Die Eigennamen „Tasten“,
    // „Reaktivieren“, „Anschluss“ und „Standort“ entfallen – beide Phasen
    // heissen wie ihr Baustein. Einzige Abweichung: die Testphase laeuft eine
    // Woche statt zwei, es gibt vor dem Test also keine Entlastungswoche.
    phases: [{ type: "rebuild" }, { type: "test", weeks: 1 }],
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

// --- Inventar (Stangen, Scheiben, Kettlebells) --------------------------------

/**
 * Eine Stange (inventory_bars). Der Schluessel ist die Naht zum Uebungskatalog:
 * `SeedExercise.barKey` zeigt darauf, die DB-Verknuepfung (`exercises.bar_id`)
 * entsteht erst beim Seed, wenn die Stange ihre ID hat. Darum muessen die
 * Stangen zwingend vor den Uebungen angelegt werden.
 */
export interface SeedBar {
  key: string;
  name: string;
  weight: number;
  isDefault: boolean;
}

// Stangen des Grundbestands. `isDefault` markiert die Stange, die der Coach
// nimmt, wenn eine Uebung keine eigene nennt.
export const barSeeds: SeedBar[] = [
  { key: "standard", name: "Standard", weight: 20, isDefault: true },
  { key: "leicht", name: "Leicht", weight: 10, isDefault: false },
  { key: "sz", name: "SZ", weight: 12.5, isDefault: false },
  { key: "sz-curl", name: "SZ-Curl", weight: 8, isDefault: false },
  { key: "kurz", name: "Kurz", weight: 15, isDefault: false },
];

// Verfuegbare Scheiben-Gewichte in kg. Ohne sie kann der Coach kein ladbares
// Gewicht runden - er faellt sonst auf eine fest verdrahtete Annahme zurueck.
export const plateSeeds: number[] = [1.25, 2.5, 5, 10, 20];

// Verfuegbare Kettlebell-Gewichte in kg (Core-Uebungen mit Zusatzlast).
export const kettlebellSeeds: number[] = [4, 6, 8, 10, 12, 16, 20, 24];

// --- Uebungskatalog -----------------------------------------------------------

/** Feine Muskel-Beteiligung einer Uebung (exercise_muscles). Die `regionId`
 *  entspricht einer Region der Master-SVG (lib/muscles.ts, MUSCLES). */
export interface SeedExerciseMuscle {
  regionId: string;
  kategorie: MuscleKategorie;
}

/**
 * Eine Katalog-Uebung (exercises) samt ihrer Muskel-Zuordnung.
 *
 * `barKey` nennt die Stange beim Namen statt bei der ID - die ID gibt es erst
 * nach dem Anlegen der Stangen. Die Position ergibt sich aus der Reihenfolge in
 * `exerciseSeeds` und steht darum nicht als eigenes Feld hier (Vorhaben #396
 * hat die doppelt vergebene 7 aufgeraeumt).
 *
 * `workWeight` ist kein Katalog-Wert, sondern der persoenliche Arbeitsstand.
 * Ein neues Konto faengt darum bei 0 an - ueberall dort, wo etwas anderes die
 * Last traegt: bei Langhantel-Uebungen die leere Stange, bei Koerpergewicht das
 * eigene Gewicht (so schon in Migration 0040 fuer das Kreuzheben entschieden).
 * Nur wo es weder Stange noch Koerpergewicht gibt (Scheibe, Kurzhantel), steht
 * ein kleiner Startwert, damit der erste Vorschlag nicht ins Leere greift.
 */
export interface SeedExercise {
  key: string;
  name: string;
  profile: ExerciseProfile;
  tier: ExerciseTier;
  equipment: ExerciseEquipment;
  barKey: string | null;
  description: string;
  metric: Metric | null;
  muscleGroups: string[];
  repRangeMin: number | null;
  repRangeMax: number | null;
  workWeight: number;
  recoveryHours: number;
  muscles: SeedExerciseMuscle[];
}

// Der Grundbestand des Uebungskatalogs. Die neun Uebungen, auf die die
// Skill-Phasen ueber `exerciseKey` zeigen, muessen hier stehen - sonst bleibt
// die Verknuepfung (skill_phase_exercises.exercise_id) leer und weder der
// Uebungsverlauf noch das Start-Popup finden die Uebung wieder.
export const exerciseSeeds: SeedExercise[] = [
  {
    key: "back_squat",
    name: "Back Squat",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Tiefe Kniebeuge mit der Langhantel auf dem oberen Rücken; Hüfte und Knie gemeinsam beugen und strecken.",
    metric: null,
    muscleGroups: ["legs", "glutes"],
    repRangeMin: 6,
    repRangeMax: 10,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "gesaess", kategorie: "primaer" },
      { regionId: "quadrizeps", kategorie: "primaer" },
      { regionId: "beinbeuger", kategorie: "sekundaer" },
      { regionId: "bauch", kategorie: "stabilisierend" },
      { regionId: "ruecken_mitte", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "bench_press",
    name: "Bench Press",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Bankdrücken auf der Flachbank: Langhantel kontrolliert zur Brust senken und senkrecht nach oben drücken.",
    metric: null,
    muscleGroups: ["chest", "triceps", "shoulders"],
    repRangeMin: 8,
    repRangeMax: 12,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "brust", kategorie: "primaer" },
      { regionId: "schultern_vorne", kategorie: "sekundaer" },
      { regionId: "trizeps", kategorie: "sekundaer" },
    ],
  },
  {
    key: "romanian_deadlift",
    name: "Romanian Deadlift (RDL)",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Rumänisches Kreuzheben: aus dem aufrechten Stand mit leicht gebeugten Knien die Hüfte nach hinten schieben, die Langhantel eng an den Beinen bis etwa Mitte Schienbein senken, Rücken gerade, dann aus der Hüfte zurück in den Stand.",
    metric: null,
    muscleGroups: ["back", "legs", "glutes"],
    repRangeMin: 4,
    repRangeMax: 8,
    workWeight: 0,
    recoveryHours: 72,
    muscles: [
      { regionId: "beinbeuger", kategorie: "primaer" },
      { regionId: "gesaess", kategorie: "primaer" },
      { regionId: "ruecken_mitte", kategorie: "primaer" },
      { regionId: "latissimus", kategorie: "sekundaer" },
      { regionId: "quadrizeps", kategorie: "sekundaer" },
      { regionId: "trapez", kategorie: "sekundaer" },
      { regionId: "bauch", kategorie: "stabilisierend" },
      { regionId: "waden", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "deadlift",
    name: "Deadlift",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Klassisches Kreuzheben: Langhantel vom Boden, Hüfte und Knie strecken sich gemeinsam, Rücken gerade und Stange eng am Körper, bis zum aufrechten Stand; danach kontrolliert zurück auf den Boden.",
    metric: null,
    muscleGroups: ["back", "legs", "glutes"],
    repRangeMin: 4,
    repRangeMax: 8,
    workWeight: 0,
    recoveryHours: 72,
    muscles: [
      { regionId: "beinbeuger", kategorie: "primaer" },
      { regionId: "gesaess", kategorie: "primaer" },
      { regionId: "quadrizeps", kategorie: "primaer" },
      { regionId: "ruecken_mitte", kategorie: "primaer" },
      { regionId: "latissimus", kategorie: "sekundaer" },
      { regionId: "trapez", kategorie: "sekundaer" },
      { regionId: "bauch", kategorie: "stabilisierend" },
      { regionId: "waden", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "bent_row",
    name: "Bent Row",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Vorgebeugtes Langhantelrudern: Oberkörper geneigt, Hantel zum unteren Brustkorb beziehungsweise Bauch ziehen.",
    metric: null,
    muscleGroups: ["back", "biceps"],
    repRangeMin: 8,
    repRangeMax: 12,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "latissimus", kategorie: "primaer" },
      { regionId: "ruecken_mitte", kategorie: "primaer" },
      { regionId: "bizeps", kategorie: "sekundaer" },
      { regionId: "schultern_hinten", kategorie: "sekundaer" },
      { regionId: "trapez", kategorie: "sekundaer" },
    ],
  },
  {
    key: "push_press",
    name: "Push Press",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Schulterdrücken mit leichtem Bein-Impuls: Langhantel von den Schultern über den Kopf drücken.",
    metric: null,
    muscleGroups: ["shoulders", "triceps"],
    repRangeMin: 5,
    repRangeMax: 10,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "schultern_vorne", kategorie: "primaer" },
      { regionId: "trizeps", kategorie: "sekundaer" },
      { regionId: "bauch", kategorie: "stabilisierend" },
      { regionId: "trapez", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "barbell_curl",
    name: "Barbell Curl",
    profile: "strength",
    tier: "accessory",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Langhantel-Bizepscurl im Stand: Hantel aus gestreckten Armen nach oben curlen, Oberarme bleiben fixiert.",
    metric: null,
    muscleGroups: ["biceps"],
    repRangeMin: 8,
    repRangeMax: 12,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [{ regionId: "bizeps", kategorie: "primaer" }],
  },
  {
    key: "dumbbell_curl",
    name: "Curl (Kurzhantel)",
    profile: "strength",
    tier: "accessory",
    equipment: "dumbbell",
    barKey: null,
    description:
      "Langhantel-Bizepscurl im Stand: Hantel aus gestreckten Armen nach oben curlen, Oberarme bleiben fixiert.",
    metric: null,
    muscleGroups: ["biceps"],
    repRangeMin: 8,
    repRangeMax: 12,
    workWeight: 10,
    recoveryHours: 48,
    muscles: [{ regionId: "bizeps", kategorie: "primaer" }],
  },
  {
    key: "plate_situps",
    name: "Core Situps",
    profile: "core",
    tier: "main",
    equipment: "plate",
    barKey: null,
    description:
      "Situps mit Zusatzlast (Hantelscheibe oder Kettlebell) vor der Brust oder über dem Kopf gehalten.",
    metric: null,
    muscleGroups: ["core"],
    repRangeMin: 12,
    repRangeMax: 20,
    workWeight: 10,
    recoveryHours: 24,
    muscles: [{ regionId: "bauch", kategorie: "primaer" }],
  },
  {
    key: "plate_twist",
    name: "Core Twist",
    profile: "core",
    tier: "main",
    equipment: "plate",
    barKey: null,
    description:
      "Sitzende Rumpfrotation (Russian Twist): Zusatzlast (Scheibe oder Kettlebell) in beiden Händen seitlich neben der Hüfte antippen.",
    metric: null,
    muscleGroups: ["core"],
    repRangeMin: 12,
    repRangeMax: 20,
    workWeight: 16,
    recoveryHours: 24,
    muscles: [
      { regionId: "bauch_seitlich", kategorie: "primaer" },
      { regionId: "bauch", kategorie: "sekundaer" },
    ],
  },
  {
    key: "plate_cocoon",
    name: "Core Cocoon",
    profile: "core",
    tier: "main",
    equipment: "plate",
    barKey: null,
    description:
      "Aus gestreckter Rückenlage Knie und Oberkörper gleichzeitig zusammenziehen (V- beziehungsweise Crunch-artig), Zusatzlast (Scheibe oder Kettlebell) in den Händen.",
    metric: null,
    muscleGroups: ["core"],
    repRangeMin: 10,
    repRangeMax: 16,
    workWeight: 10,
    recoveryHours: 24,
    muscles: [
      { regionId: "bauch", kategorie: "primaer" },
      { regionId: "bauch_seitlich", kategorie: "sekundaer" },
    ],
  },
  {
    key: "lunge",
    name: "Lunge",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    barKey: "standard",
    description:
      "Ausfallschritt mit Langhantel auf dem Rücken: pro Wiederholung ein Bein nach vorn, hinteres Knie bis knapp über den Boden senken.",
    metric: null,
    muscleGroups: ["legs", "glutes"],
    repRangeMin: 8,
    repRangeMax: 12,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "gesaess", kategorie: "primaer" },
      { regionId: "quadrizeps", kategorie: "primaer" },
      { regionId: "beinbeuger", kategorie: "sekundaer" },
    ],
  },
  {
    key: "pull_over",
    name: "Pull Over",
    profile: "strength",
    tier: "accessory",
    equipment: "barbell",
    barKey: "leicht",
    description:
      "Überzug auf der Bank: Langhantel mit nahezu gestreckten Armen hinter den Kopf absenken und über die Brust zurückführen.",
    metric: null,
    muscleGroups: ["back", "chest"],
    repRangeMin: 8,
    repRangeMax: 12,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "latissimus", kategorie: "primaer" },
      { regionId: "brust", kategorie: "sekundaer" },
      { regionId: "trizeps", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "dead_hang",
    name: "Dead Hang",
    profile: "bodyweight",
    tier: "accessory",
    equipment: "bar",
    barKey: null,
    description:
      "Passiver Hang an der Stange mit gestreckten Armen; Schultern aktiv, Griff und Rumpf halten die Position auf Zeit.",
    metric: "duration",
    muscleGroups: ["back", "grip", "shoulders"],
    repRangeMin: 20,
    repRangeMax: 40,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "latissimus", kategorie: "stabilisierend" },
      { regionId: "schultern_hinten", kategorie: "stabilisierend" },
      { regionId: "trapez", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "scapular_pullup",
    name: "Scapular Pull-Up",
    profile: "bodyweight",
    tier: "accessory",
    equipment: "bar",
    barKey: null,
    description:
      "Aus dem Hang nur die Schulterblätter nach unten und hinten ziehen, Arme bleiben gestreckt; baut die Ansteuerung für den Klimmzug.",
    metric: "reps",
    muscleGroups: ["back", "shoulders"],
    repRangeMin: 5,
    repRangeMax: 10,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "trapez", kategorie: "primaer" },
      { regionId: "latissimus", kategorie: "sekundaer" },
    ],
  },
  {
    key: "band_pullup",
    name: "Band Pull-Up",
    profile: "bodyweight",
    tier: "accessory",
    equipment: "band",
    barKey: null,
    description:
      "Klimmzug mit Widerstandsband als Unterstützung; sauber bis Kinn über die Stange, kontrolliert ablassen. Im Skill von starkem zu leichtem Band.",
    metric: "reps",
    muscleGroups: ["back", "biceps"],
    repRangeMin: 5,
    repRangeMax: 10,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "latissimus", kategorie: "primaer" },
      { regionId: "bizeps", kategorie: "sekundaer" },
      { regionId: "ruecken_mitte", kategorie: "sekundaer" },
    ],
  },
  {
    key: "negative_pullup",
    name: "Negative Pull-Up",
    profile: "bodyweight",
    tier: "accessory",
    equipment: "bar",
    barKey: null,
    description:
      "Nur die absenkende Phase des Klimmzugs: oben starten und langsam (etwa 5 Sekunden) kontrolliert ablassen.",
    metric: "reps",
    muscleGroups: ["back", "biceps"],
    repRangeMin: 3,
    repRangeMax: 6,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "latissimus", kategorie: "primaer" },
      { regionId: "bizeps", kategorie: "sekundaer" },
      { regionId: "ruecken_mitte", kategorie: "sekundaer" },
    ],
  },
  {
    key: "strict_pullup",
    name: "Strict Pull-Up",
    profile: "bodyweight",
    tier: "main",
    equipment: "bar",
    barKey: null,
    description:
      "Strenger Klimmzug aus vollem Hang ohne Schwung; Kinn über die Stange, kontrolliert in den Hang zurück.",
    metric: "reps",
    muscleGroups: ["back", "biceps"],
    repRangeMin: 3,
    repRangeMax: 12,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "latissimus", kategorie: "primaer" },
      { regionId: "bizeps", kategorie: "sekundaer" },
      { regionId: "ruecken_mitte", kategorie: "sekundaer" },
      { regionId: "trapez", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "knee_pushup",
    name: "Knee Push-Up",
    profile: "bodyweight",
    tier: "accessory",
    equipment: "bodyweight",
    barKey: null,
    description:
      "Liegestütz auf den Knien; Körper von Knie bis Kopf gerade, Brust kontrolliert absenken und drücken.",
    metric: "reps",
    muscleGroups: ["chest", "triceps", "shoulders"],
    repRangeMin: 8,
    repRangeMax: 15,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "brust", kategorie: "primaer" },
      { regionId: "schultern_vorne", kategorie: "sekundaer" },
      { regionId: "trizeps", kategorie: "sekundaer" },
    ],
  },
  {
    key: "incline_pushup",
    name: "Incline Push-Up",
    profile: "bodyweight",
    tier: "accessory",
    equipment: "bodyweight",
    barKey: null,
    description:
      "Liegestütz mit erhöhten Händen (Bank oder Erhöhung); leichter als am Boden, gleiche gerade Körperlinie.",
    metric: "reps",
    muscleGroups: ["chest", "triceps", "shoulders"],
    repRangeMin: 8,
    repRangeMax: 15,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "brust", kategorie: "primaer" },
      { regionId: "schultern_vorne", kategorie: "sekundaer" },
      { regionId: "trizeps", kategorie: "sekundaer" },
    ],
  },
  {
    key: "full_pushup",
    name: "Full Push-Up",
    profile: "bodyweight",
    tier: "main",
    equipment: "bodyweight",
    barKey: null,
    description:
      "Voller Liegestütz am Boden; Körper gerade, Brust bis knapp über den Boden senken und kontrolliert drücken.",
    metric: "reps",
    muscleGroups: ["chest", "triceps", "shoulders"],
    repRangeMin: 10,
    repRangeMax: 35,
    workWeight: 0,
    recoveryHours: 48,
    muscles: [
      { regionId: "brust", kategorie: "primaer" },
      { regionId: "schultern_vorne", kategorie: "sekundaer" },
      { regionId: "trizeps", kategorie: "sekundaer" },
      { regionId: "bauch", kategorie: "stabilisierend" },
    ],
  },
  {
    key: "plank",
    name: "Plank",
    profile: "core",
    tier: "accessory",
    equipment: "bodyweight",
    barKey: null,
    description:
      "Unterarmstütz: Ellenbogen unter den Schultern, Unterarme flach am Boden, Füße hüftbreit auf den Zehen. Körper eine gerade Linie von Kopf bis Ferse, Bauch und Gesäß angespannt, Blick nach unten.",
    metric: "duration",
    muscleGroups: ["core"],
    repRangeMin: null,
    repRangeMax: null,
    workWeight: 0,
    recoveryHours: 24,
    muscles: [
      { regionId: "bauch", kategorie: "primaer" },
      { regionId: "bauch_seitlich", kategorie: "sekundaer" },
      { regionId: "gesaess", kategorie: "sekundaer" },
      { regionId: "quadrizeps", kategorie: "stabilisierend" },
      { regionId: "schultern_vorne", kategorie: "stabilisierend" },
    ],
  },
];
