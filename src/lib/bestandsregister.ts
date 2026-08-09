// Bestandsregister: die eine Stelle, an der steht, aus welchen Tabellen der
// Datenbestand eines Nutzers besteht. Abruf (exportSource), Voll-Export
// (exportData), Wiederherstellung (restoreData) und die Loesch-/Einfuege-
// Reihenfolge (useRestore) lesen ausschliesslich hier.
//
// Frueher stand diese Liste an acht Stellen von Hand aufgezaehlt. Wurde eine
// vergessen, fiel die betroffene Tabelle still aus der Sicherung heraus und
// bemerkt wurde es erst beim Wiederherstellen. Neue Tabelle heisst jetzt: einen
// Eintrag hier ergaenzen, sonst nichts.
//
// Bewusst ohne Import aus anderen App-Modulen, damit es keinen Ringschluss gibt.
// Die Verbindung zu den Zod-Schemas laeuft ueber den Namen des Row-Schemas in
// `src/schemas`; ein Test prueft, dass Register und Schemas deckungsgleich sind.

/** Wo die Zeilen einer Tabelle im Export-JSON liegen. */
export type Ablage =
  /** Eigene Liste auf oberster Ebene (der Normalfall). */
  | "liste"
  /** Im gebuendelten Inventar-Block (`inventory.bars` usw.). */
  | "inventar"
  /** Die Einheiten selbst: eigene Liste, Zeilen tragen die Uebungen geschachtelt. */
  | "einheiten"
  /** Keine eigene Liste - steckt geschachtelt in den Einheiten. */
  | "in_einheit";

export interface RegisterEintrag {
  /** Tabellenname in der Datenbank. */
  readonly tabelle: string;
  /** Schluessel im Roh-Bestand und im Export-JSON. */
  readonly key: string;
  /**
   * Fremdschluessel-Tiefe: 0 = haengt an keiner anderen Tabelle des Bestands.
   * Daraus fallen Einfuege- (klein zuerst) und Loesch-Reihenfolge (gross zuerst)
   * automatisch heraus, statt getrennt gepflegt zu werden.
   */
  readonly tiefe: number;
  readonly ablage: Ablage;
  /** Einzelzeile pro Nutzer (settings), wird per Upsert ersetzt statt eingefuegt. */
  readonly einzelzeile: boolean;
  /** Name des Row-Schemas in `src/schemas` (Gegenprobe im Test). */
  readonly schema: string;
}

// Reihenfolge hier = Reihenfolge im Export-JSON (nach Themen gruppiert, damit
// die Datei lesbar bleibt). Die technische Reihenfolge fuer Loeschen/Einfuegen
// kommt aus `tiefe` und wird weiter unten daraus berechnet.
export const BESTANDSREGISTER = [
  // --- Inventar ---
  { tabelle: "inventory_bars", key: "bars", tiefe: 0, ablage: "inventar", einzelzeile: false, schema: "inventoryBarRow" },
  { tabelle: "inventory_plates", key: "plates", tiefe: 0, ablage: "inventar", einzelzeile: false, schema: "inventoryPlateRow" },
  { tabelle: "inventory_kettlebells", key: "kettlebells", tiefe: 0, ablage: "inventar", einzelzeile: false, schema: "inventoryKettlebellRow" },
  { tabelle: "inventory_dumbbells", key: "dumbbells", tiefe: 0, ablage: "inventar", einzelzeile: false, schema: "inventoryDumbbellRow" },
  { tabelle: "inventory_equipment", key: "equipment", tiefe: 0, ablage: "inventar", einzelzeile: false, schema: "inventoryEquipmentRow" },

  // --- Uebungen ---
  { tabelle: "exercises", key: "exercises", tiefe: 1, ablage: "liste", einzelzeile: false, schema: "exerciseRow" },
  { tabelle: "exercise_muscles", key: "exerciseMuscles", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "exerciseMuscleRow" },

  // --- Workouts (Vorlagen) ---
  { tabelle: "templates", key: "templates", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "templateRow" },
  { tabelle: "template_exercises", key: "templateExercises", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "templateExerciseRow" },

  // --- Journey-Vorlagen ---
  { tabelle: "journey_templates", key: "journeyTemplates", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "journeyTemplateRow" },
  { tabelle: "journey_template_phases", key: "journeyTemplatePhases", tiefe: 1, ablage: "liste", einzelzeile: false, schema: "journeyTemplatePhaseRow" },

  // --- Skills ---
  { tabelle: "skills", key: "skills", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "skillRow" },
  { tabelle: "skill_phases", key: "skillPhases", tiefe: 1, ablage: "liste", einzelzeile: false, schema: "skillPhaseRow" },
  { tabelle: "skill_phase_exercises", key: "skillPhaseExercises", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "skillPhaseExerciseRow" },
  { tabelle: "skill_phase_equipment", key: "skillPhaseEquipment", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "skillPhaseEquipmentRow" },

  // --- Journeys ---
  { tabelle: "journeys", key: "journeys", tiefe: 1, ablage: "liste", einzelzeile: false, schema: "journeyRow" },
  { tabelle: "phases", key: "phases", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "phaseRow" },
  { tabelle: "journey_workouts", key: "journeyWorkouts", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "journeyWorkoutRow" },

  // --- Einheiten (im Export geschachtelt: sessions -> entries -> sets) ---
  { tabelle: "sessions", key: "sessions", tiefe: 3, ablage: "einheiten", einzelzeile: false, schema: "sessionRow" },
  { tabelle: "session_exercises", key: "sessionExercises", tiefe: 4, ablage: "in_einheit", einzelzeile: false, schema: "sessionExerciseRow" },
  { tabelle: "sets", key: "sets", tiefe: 5, ablage: "in_einheit", einzelzeile: false, schema: "setRow" },

  // --- Fortschritt und Koerperdaten ---
  { tabelle: "skill_progress", key: "skillProgress", tiefe: 1, ablage: "liste", einzelzeile: false, schema: "skillProgressRow" },
  { tabelle: "body_log", key: "bodyLog", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "bodyLogRow" },
  { tabelle: "composition", key: "composition", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "compositionRow" },
  { tabelle: "exercise_milestones", key: "milestones", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "exerciseMilestoneRow" },
  { tabelle: "composition_milestones", key: "compositionMilestones", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "compositionMilestoneRow" },
  { tabelle: "rm_tests", key: "rmTests", tiefe: 2, ablage: "liste", einzelzeile: false, schema: "rmTestRow" },
  { tabelle: "zeitraeume", key: "zeitraeume", tiefe: 0, ablage: "liste", einzelzeile: false, schema: "zeitraumRow" },

  // --- Einstellungen (eine Zeile pro Nutzer) ---
  { tabelle: "settings", key: "settings", tiefe: 0, ablage: "liste", einzelzeile: true, schema: "settingsRow" },
] as const satisfies readonly RegisterEintrag[];

export type BestandsEintrag = (typeof BESTANDSREGISTER)[number];

type ListenEintrag = Extract<BestandsEintrag, { einzelzeile: false }>;
type EinzelEintrag = Extract<BestandsEintrag, { einzelzeile: true }>;

/** Schluessel aller Tabellen, die als Liste gefuehrt werden. */
export type ListenKey = ListenEintrag["key"];
/** Schluessel der Einzelzeilen-Tabellen (settings). */
export type EinzelKey = EinzelEintrag["key"];
/** Tabellennamen aller Listen-Tabellen. */
export type ListenTabelle = ListenEintrag["tabelle"];
/** Tabellennamen der Einzelzeilen-Tabellen. */
export type EinzelTabelle = EinzelEintrag["tabelle"];
/** Schluessel im Inventar-Block des Exports. */
export type InventarKey = Extract<BestandsEintrag, { ablage: "inventar" }>["key"];
/** Schluessel der flachen Listen auf oberster Ebene (ohne settings). */
export type ListeKey = Extract<
  BestandsEintrag,
  { ablage: "liste"; einzelzeile: false }
>["key"];

function istListe(e: BestandsEintrag): e is ListenEintrag {
  return !e.einzelzeile;
}

// Eltern vor Kindern: nach Tiefe sortiert. Die Sortierung ist stabil, innerhalb
// derselben Tiefe bleibt also die Reihenfolge des Registers erhalten.
const nachTiefe: readonly ListenTabelle[] = [...BESTANDSREGISTER]
  .filter(istListe)
  .sort((a, b) => a.tiefe - b.tiefe)
  .map((e) => e.tabelle);

/** Einfuegen beim Wiederherstellen: Eltern zuerst. Ohne settings (Upsert). */
export const EINFUEGE_REIHENFOLGE: readonly ListenTabelle[] = nachTiefe;

/** Loeschen beim Wiederherstellen: Kinder zuerst, exaktes Spiegelbild. */
export const LOESCH_REIHENFOLGE: readonly ListenTabelle[] = [...nachTiefe].reverse();
