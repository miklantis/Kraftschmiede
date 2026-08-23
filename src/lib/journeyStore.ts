// Naht zum Journey-Speicher: die schmale Schnittstelle, ueber die alle Schreiber
// rund um die Journey ihre Datenbank-Handgriffe abspielen – die Journey selbst
// samt Phasen (journeys, phases), die eingefrorenen Referenzgewichte des
// Uebungskatalogs (exercises), die Zuordnung Workout-zu-Journey
// (journey_workouts) und die Workout-Vorlagen (templates, template_exercises).
// Ein Store fuer diese Tabellen, weil sie fachlich denselben Bereich betreffen:
// der Journey-Start friert Referenzgewichte ein, der Journey-Wechsel uebernimmt
// Zuordnungen, und eine Zuordnung ist ohne ihre Vorlage sinnlos.
//
// Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb und ein
// Speicher im Arbeitsspeicher fuer Tests – damit ist der Schreibpfad automatisch
// pruefbar. Die Pruefung "lief der Schritt durch?" sitzt hier an genau einer
// Stelle (`must`), statt bei jedem Aufrufer.
//
// Vorbild und Form: `zeitraumStore.ts`, `compositionStore.ts`,
// `exerciseStore.ts`. Unterste Schicht: kennt nur Supabase und die
// Schema-Typen, niemals die Mutationen oder Hooks darueber. Insbesondere weiss
// diese Datei nichts von pausierbaren Mutationen – die Registrierung und ihre
// Reihenfolge (ADR-0009) bleiben unberuehrt bei den Aufrufern.

import { supabase } from "@/lib/supabase";
import type {
  JourneyInsert,
  JourneyWorkoutRow,
  LoadBuilder,
  PhaseInsert,
  PlanBuilder,
  TemplateExerciseRow,
  TemplateRow,
} from "@/schemas";

/** Zeile beim Anlegen einer Journey (Id vergibt die Datenbank). */
export type JourneyRowIns = JourneyInsert;

/** Zeile beim Anlegen einer Phase (Id vergibt die Datenbank). */
export type PhaseRowIns = PhaseInsert;

/** Zeile einer Zuordnung Workout-zu-Journey. Die Id wird bewusst clientseitig
 *  vergeben, damit ein ohne Netz gesetzter Schalter spaeter unveraendert
 *  nachgeschickt werden kann. */
export type ZuordnungRow = JourneyWorkoutRow;

/** Zeile einer Workout-Vorlage – ebenfalls mit clientseitig vergebener Id. */
export type VorlageRow = TemplateRow;

/** Zeile einer Uebung in einer Workout-Vorlage, Id clientseitig vergeben. */
export type VorlageUebungRow = TemplateExerciseRow;

/** Die Bauart-Vorgaben eines Bausteins (phase_types), auf das reduziert, was
 *  beim Anlegen einer Phase von dort kommt. Seit Migration 0049 traegt die
 *  Vorlagenphase diese Angaben nicht mehr selbst – der Journey-Start schlaegt
 *  sie ueber `key` (= `phases.focus`) hier nach. */
export interface BausteinBauartRow {
  key: string;
  plan_builder: PlanBuilder | null;
  load_builder: LoadBuilder | null;
  careful: boolean;
}

/** Arbeitsgewicht einer Uebung – die Grundlage fuers Einfrieren des
 *  Referenzgewichts beim Start einer Lastfaktor-Journey. */
export interface ArbeitsgewichtRow {
  id: string;
  work_weight: number;
}

/** Schmale Schnittstelle fuer alle Schreibvorgaenge rund um die Journey. Jede
 *  Methode kapselt genau einen Datenbank-Handgriff und wirft bei Fehler –
 *  Fehlerbehandlung an einem Ort. Welche Aktion welche Handgriffe in welcher
 *  Reihenfolge ausloest, liegt beim Aufrufer (journeyWrite), nicht hier. */
export interface JourneyStore {
  /** Id der derzeit aktiven Journey, oder null. ADR-0004: dass es hoechstens
   *  eine gibt, sichert die Datenbank – hier wird nur gelesen. */
  findActiveJourneyId(): Promise<string | null>;
  /** Die abgeloeste Journey ins Archiv legen: nicht mehr aktiv, Enddatum. */
  archiveJourney(id: string, endDatum: string): Promise<void>;
  /** Neue Journey anlegen und ihre Id zurueckgeben. */
  insertJourney(row: JourneyRowIns): Promise<string>;
  renameJourney(id: string, name: string): Promise<void>;
  insertPhasen(rows: PhaseRowIns[]): Promise<void>;
  /** Bauart-Vorgaben aller Bausteine eines Nutzers – gelesen genau dort, wo
   *  eine Phase entsteht (Konzept Bausteine, Abschnitt 2), nie im Training. */
  listBausteine(userId: string): Promise<BausteinBauartRow[]>;
  /** Arbeitsgewichte des Uebungskatalogs eines Nutzers lesen. */
  listArbeitsgewichte(userId: string): Promise<ArbeitsgewichtRow[]>;
  setReferenzgewicht(exerciseId: string, gewicht: number): Promise<void>;
  /** Alle gesetzten Referenzgewichte eines Nutzers wegraeumen. */
  clearReferenzgewichte(userId: string): Promise<void>;
  /** Die zugewiesenen Workout-Ids einer Journey. */
  listZuordnungen(journeyId: string): Promise<string[]>;
  insertZuordnungen(rows: ZuordnungRow[]): Promise<void>;
  /** Zuordnung ueber (journey_id, template_id) loesen – idempotent, auch wenn
   *  die Zeile zwischenzeitlich fehlt. */
  deleteZuordnung(journeyId: string, templateId: string): Promise<void>;
  insertVorlage(row: VorlageRow): Promise<void>;
  renameVorlage(id: string, name: string): Promise<void>;
  setVorlageAktiv(id: string, aktiv: boolean): Promise<void>;
  deleteVorlageUebungen(templateId: string): Promise<void>;
  insertVorlageUebungen(rows: VorlageUebungRow[]): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseJourneyStore: JourneyStore = {
  async findActiveJourneyId() {
    const { data, error } = await supabase
      .from("journeys")
      .select("id")
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (data as { id: string }).id : null;
  },
  async archiveJourney(id, endDatum) {
    must(
      await supabase
        .from("journeys")
        .update({ active: false, status: "archived", end_date: endDatum })
        .eq("id", id),
    );
  },
  async insertJourney(row) {
    const { data, error } = await supabase
      .from("journeys")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  },
  async renameJourney(id, name) {
    must(await supabase.from("journeys").update({ name }).eq("id", id));
  },
  async insertPhasen(rows) {
    must(await supabase.from("phases").insert(rows));
  },
  async listBausteine(userId) {
    const { data, error } = await supabase
      .from("phase_types")
      .select("key, plan_builder, load_builder, careful")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as BausteinBauartRow[];
  },
  async listArbeitsgewichte(userId) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, work_weight")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as ArbeitsgewichtRow[];
  },
  async setReferenzgewicht(exerciseId, gewicht) {
    must(
      await supabase
        .from("exercises")
        .update({ reference_weight: gewicht })
        .eq("id", exerciseId),
    );
  },
  async clearReferenzgewichte(userId) {
    // Raeumt Gewicht und Phasenbezug zusammen: ein Anker ohne Gewicht zeigt
    // sonst auf eine Phase der abgeloesten Journey. Der Filter greift, sobald
    // eines von beiden gesetzt ist - sonst blieben genau die Zeilen stehen,
    // bei denen nur noch der Phasenbezug haengt.
    must(
      await supabase
        .from("exercises")
        .update({
          reference_weight: null,
          reference_phase_id: null,
          plan_start_weight: null,
        })
        .eq("user_id", userId)
        .or(
          "reference_weight.not.is.null,reference_phase_id.not.is.null,plan_start_weight.not.is.null",
        ),
    );
  },
  async listZuordnungen(journeyId) {
    const { data, error } = await supabase
      .from("journey_workouts")
      .select("template_id")
      .eq("journey_id", journeyId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ template_id: string }>).map(
      (r) => r.template_id,
    );
  },
  async insertZuordnungen(rows) {
    must(await supabase.from("journey_workouts").insert(rows));
  },
  async deleteZuordnung(journeyId, templateId) {
    must(
      await supabase
        .from("journey_workouts")
        .delete()
        .eq("journey_id", journeyId)
        .eq("template_id", templateId),
    );
  },
  async insertVorlage(row) {
    must(await supabase.from("templates").insert(row));
  },
  async renameVorlage(id, name) {
    must(await supabase.from("templates").update({ name }).eq("id", id));
  },
  async setVorlageAktiv(id, aktiv) {
    must(
      await supabase.from("templates").update({ active: aktiv }).eq("id", id),
    );
  },
  async deleteVorlageUebungen(templateId) {
    must(
      await supabase
        .from("template_exercises")
        .delete()
        .eq("template_id", templateId),
    );
  },
  async insertVorlageUebungen(rows) {
    must(await supabase.from("template_exercises").insert(rows));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe, je Bereich
 *  getrennt. `folge` haelt zusaetzlich die Reihenfolge aller Handgriffe fest –
 *  entscheidend beim Journey-Start (erst abloesen, dann anlegen) und beim
 *  Speichern einer Vorlage (erst Uebungsliste weg, dann neu). */
export interface MemoryJourneyLog {
  journeysInserted: JourneyRowIns[];
  journeysArchived: Array<{ id: string; endDatum: string }>;
  journeysRenamed: Array<{ id: string; name: string }>;
  phasenInserted: PhaseRowIns[][];
  referenzgewichte: Array<{ exerciseId: string; gewicht: number }>;
  referenzgewichteCleared: string[];
  zuordnungenInserted: ZuordnungRow[][];
  zuordnungenDeleted: Array<{ journeyId: string; templateId: string }>;
  vorlagenInserted: VorlageRow[];
  vorlagenRenamed: Array<{ id: string; name: string }>;
  vorlagenAktiv: Array<{ id: string; aktiv: boolean }>;
  vorlagenUebungenDeleted: string[];
  vorlagenUebungenInserted: VorlageUebungRow[][];
  folge: string[];
}

/** Ausgangslage, die der Test-Speicher beim Lesen zurueckgibt. */
export interface MemoryJourneySeed {
  /** Id der aktiven Journey vor dem Start einer neuen (null = keine). */
  aktiveJourneyId?: string | null;
  /** Bauart-Vorgaben der Bausteine, die der Speicher zurueckgibt. */
  bausteine?: BausteinBauartRow[];
  /** Arbeitsgewichte des Uebungskatalogs, je Nutzer-Kennung. */
  arbeitsgewichte?: ArbeitsgewichtRow[];
  /** Bereits zugewiesene Workout-Ids, je Journey-Kennung. */
  zuordnungen?: Record<string, string[]>;
  /** Id, die der Speicher fuer eine neu angelegte Journey vergibt. */
  neueJourneyId?: string;
}

/** Erzeugt einen Journey-Speicher, der nichts schreibt, sondern jeden Handgriff
 *  protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank. Lesende
 *  Handgriffe beantworten die uebergebene Ausgangslage. */
export function createMemoryJourneyStore(seed: MemoryJourneySeed = {}): {
  store: JourneyStore;
  log: MemoryJourneyLog;
} {
  const neueJourneyId = seed.neueJourneyId ?? "journey-neu";
  const log: MemoryJourneyLog = {
    journeysInserted: [],
    journeysArchived: [],
    journeysRenamed: [],
    phasenInserted: [],
    referenzgewichte: [],
    referenzgewichteCleared: [],
    zuordnungenInserted: [],
    zuordnungenDeleted: [],
    vorlagenInserted: [],
    vorlagenRenamed: [],
    vorlagenAktiv: [],
    vorlagenUebungenDeleted: [],
    vorlagenUebungenInserted: [],
    folge: [],
  };
  const store: JourneyStore = {
    async findActiveJourneyId() {
      log.folge.push("findActiveJourneyId");
      return seed.aktiveJourneyId ?? null;
    },
    async archiveJourney(id, endDatum) {
      log.journeysArchived.push({ id, endDatum });
      log.folge.push("archiveJourney");
    },
    async insertJourney(row) {
      log.journeysInserted.push(row);
      log.folge.push("insertJourney");
      return neueJourneyId;
    },
    async renameJourney(id, name) {
      log.journeysRenamed.push({ id, name });
      log.folge.push("renameJourney");
    },
    async insertPhasen(rows) {
      log.phasenInserted.push(rows);
      log.folge.push("insertPhasen");
    },
    async listBausteine() {
      log.folge.push("listBausteine");
      return seed.bausteine ?? [];
    },
    async listArbeitsgewichte() {
      log.folge.push("listArbeitsgewichte");
      return seed.arbeitsgewichte ?? [];
    },
    async setReferenzgewicht(exerciseId, gewicht) {
      log.referenzgewichte.push({ exerciseId, gewicht });
      log.folge.push("setReferenzgewicht");
    },
    async clearReferenzgewichte(userId) {
      log.referenzgewichteCleared.push(userId);
      log.folge.push("clearReferenzgewichte");
    },
    async listZuordnungen(journeyId) {
      log.folge.push("listZuordnungen");
      return seed.zuordnungen?.[journeyId] ?? [];
    },
    async insertZuordnungen(rows) {
      log.zuordnungenInserted.push(rows);
      log.folge.push("insertZuordnungen");
    },
    async deleteZuordnung(journeyId, templateId) {
      log.zuordnungenDeleted.push({ journeyId, templateId });
      log.folge.push("deleteZuordnung");
    },
    async insertVorlage(row) {
      log.vorlagenInserted.push(row);
      log.folge.push("insertVorlage");
    },
    async renameVorlage(id, name) {
      log.vorlagenRenamed.push({ id, name });
      log.folge.push("renameVorlage");
    },
    async setVorlageAktiv(id, aktiv) {
      log.vorlagenAktiv.push({ id, aktiv });
      log.folge.push("setVorlageAktiv");
    },
    async deleteVorlageUebungen(templateId) {
      log.vorlagenUebungenDeleted.push(templateId);
      log.folge.push("deleteVorlageUebungen");
    },
    async insertVorlageUebungen(rows) {
      log.vorlagenUebungenInserted.push(rows);
      log.folge.push("insertVorlageUebungen");
    },
  };
  return { store, log };
}
