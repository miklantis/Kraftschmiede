// Naht zum Erstbefuellungs-Speicher: die schmale Schnittstelle, ueber die die
// Erstbefuellung eines neuen Kontos ihre Datenbank-Handgriffe abspielt. Ein
// Store fuer alle beteiligten Tabellen (Bausteine, Inventar, Uebungskatalog
// samt Muskel-Zuordnung, Journey-Vorlagen, Skills, Ausstattung), weil sie in
// genau einem Zug geschrieben werden und ihre Reihenfolge voneinander abhaengt
// (ADR-0019: die Linie verlaeuft am Schreibvorgang, nicht an der Tabelle).
//
// Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb und ein
// Speicher im Arbeitsspeicher fuer Tests. Der Test-Speicher protokolliert nicht
// nur, sondern merkt sich das Geschriebene und beantwortet damit die Lesefragen
// - nur so laesst sich pruefen, dass ein zweiter Lauf nichts mehr aendert.
//
// Unterste Schicht: kennt nur Supabase und die Schema-Typen, niemals die
// Abfolge darueber. Welche Tabelle wann drankommt, entscheidet seedWrite.
//
// Die Pruefung "lief der Schritt durch?" sitzt hier an genau einer Stelle
// (`must`/`mustZeilen`). Anders als in den uebrigen Stores bekommt sie den
// Schritt als Text mit: der Seed schreibt in dreizehn Tabellen hintereinander,
// und die Meldung im Fehlerfall soll wie bisher sagen, an welcher davon es
// haengt.

import { supabase } from "@/lib/supabase";
import type {
  ExerciseInsert,
  ExerciseMuscleInsert,
  InventoryBarInsert,
  InventoryEquipmentInsert,
  InventoryKettlebellInsert,
  InventoryPlateInsert,
  JourneyTemplateInsert,
  JourneyTemplatePhaseInsert,
  PhaseTypeInsert,
  SkillInsert,
  SkillPhaseExerciseInsert,
  SkillPhaseInsert,
  SkillPhaseEquipmentInsert,
} from "@/schemas";

/** Zeile mit Kennung und Schluessel, wie sie nach dem Anlegen zurueckkommt.
 *  Der Schluessel kann leer sein: aelterer Bestand (V1-Import, von Hand
 *  angelegte Stangen) hat keinen. */
export interface SchluesselZeile {
  id: string;
  key: string | null;
}

/** Angelegte Skill-Phase. Sie hat keinen Schluessel, ihre Stelle ergibt sich
 *  aus Skill und Position - darueber findet die Phasen-Uebung ihre Phase. */
export interface SkillPhaseZeile {
  id: string;
  skill_id: string;
  position: number;
}

/** Schmale Schnittstelle fuer die Erstbefuellung: ein Handgriff je Frage und
 *  je Schreibvorgang. Die Lesehandgriffe beantworten immer nur "was hat dieses
 *  Konto schon?" - der Bestand entscheidet, was noch fehlt, und das entscheidet
 *  der Aufrufer (seedWrite), nicht der Store. */
export interface SeedStore {
  // --- Lesen: was hat das Konto schon? ---

  /** Zahl der Skills. Null Skills gilt als "noch nie geseedet". */
  zaehleSkills(): Promise<number>;
  listBausteinSchluessel(): Promise<string[]>;
  listEquipmentSchluessel(): Promise<string[]>;
  /** Stangen mit Kennung: der Uebungskatalog braucht sie fuer `bar_id`. */
  listStangen(): Promise<SchluesselZeile[]>;
  zaehleScheiben(): Promise<number>;
  zaehleKettlebells(): Promise<number>;
  /** Katalog-Uebungen mit Kennung: einmal fuer "was fehlt noch?" und einmal,
   *  um die Skill-Phasen-Uebungen daran zu haengen. */
  listUebungen(): Promise<SchluesselZeile[]>;

  // --- Schreiben ---

  insertBausteine(rows: PhaseTypeInsert[]): Promise<void>;
  /** Gibt die angelegten Zeilen samt Kennung zurueck - der Katalog haengt
   *  daran. */
  insertStangen(rows: InventoryBarInsert[]): Promise<SchluesselZeile[]>;
  insertScheiben(rows: InventoryPlateInsert[]): Promise<void>;
  insertKettlebells(rows: InventoryKettlebellInsert[]): Promise<void>;
  /** Gibt die angelegten Zeilen samt Kennung zurueck - Muskel-Zuordnung und
   *  Skill-Phasen-Uebungen haengen daran. */
  insertUebungen(rows: ExerciseInsert[]): Promise<SchluesselZeile[]>;
  insertUebungsMuskeln(rows: ExerciseMuscleInsert[]): Promise<void>;
  /** Gibt die angelegten Zeilen samt Kennung zurueck - die Vorlagenphasen
   *  haengen daran. */
  insertVorlagen(rows: JourneyTemplateInsert[]): Promise<SchluesselZeile[]>;
  insertVorlagenPhasen(rows: JourneyTemplatePhaseInsert[]): Promise<void>;
  /** Gibt die angelegten Zeilen samt Kennung zurueck - die Skill-Phasen
   *  haengen daran. */
  insertSkills(rows: SkillInsert[]): Promise<SchluesselZeile[]>;
  /** Gibt Kennung, Skill und Position zurueck - die Phasen-Uebungen und das
   *  Phasen-Equipment haengen daran. */
  insertSkillPhasen(rows: SkillPhaseInsert[]): Promise<SkillPhaseZeile[]>;
  insertSkillUebungen(rows: SkillPhaseExerciseInsert[]): Promise<void>;
  insertSkillEquipment(rows: SkillPhaseEquipmentInsert[]): Promise<void>;
  insertEquipment(rows: InventoryEquipmentInsert[]): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit dem Schritt davor. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(
  res: { error: { message: string } | null },
  schritt: string,
): void {
  if (res.error) throw new Error(`${schritt} fehlgeschlagen: ${res.error.message}`);
}

/** Wie `must`, gibt aber die zurueckgegebenen Zeilen heraus. Fuer Lesefragen:
 *  kein Ergebnis heisst leerer Bestand, nicht Fehler. */
function mustListe<T>(
  res: { data: T[] | null; error: { message: string } | null },
  schritt: string,
): T[] {
  must(res, schritt);
  return res.data ?? [];
}

/** Wie `must`, gibt aber die angelegten Zeilen heraus. Kommt nach einem
 *  Anlegen nichts zurueck, ist der Fehler hier und nicht erst beim
 *  Verknuepfen. */
function mustZeilen<T>(
  res: { data: T[] | null; error: { message: string } | null },
  schritt: string,
): T[] {
  must(res, schritt);
  if (res.data === null) {
    throw new Error(`${schritt}: keine IDs zurueckgegeben.`);
  }
  return res.data;
}

/** Liest die Schluessel einer Tabelle. Leere Schluessel (aelterer Bestand)
 *  fallen weg - sie koennen mit keinem Seed-Schluessel kollidieren. */
async function leseSchluessel(
  tabelle: "phase_types" | "inventory_equipment",
  schritt: string,
): Promise<string[]> {
  const res = await supabase
    .from(tabelle)
    .select("key")
    .returns<Array<{ key: string | null }>>();
  const zeilen = mustListe(res, schritt);
  return zeilen.map((z) => z.key).filter((k): k is string => k !== null);
}

/** Zaehlt die Zeilen einer Tabelle, ohne sie zu laden. */
async function zaehleZeilen(
  tabelle: "skills" | "inventory_plates" | "inventory_kettlebells",
  schritt: string,
): Promise<number> {
  const res = await supabase
    .from(tabelle)
    .select("*", { count: "exact", head: true });
  must(res, schritt);
  return res.count ?? 0;
}

export const supabaseSeedStore: SeedStore = {
  async zaehleSkills() {
    return zaehleZeilen("skills", "Pruefung des Datenstands");
  },
  async listBausteinSchluessel() {
    return leseSchluessel("phase_types", "Bausteine pruefen");
  },
  async listEquipmentSchluessel() {
    return leseSchluessel("inventory_equipment", "Equipment pruefen");
  },
  async listStangen() {
    return mustListe(
      await supabase
        .from("inventory_bars")
        .select("id, key")
        .returns<SchluesselZeile[]>(),
      "Stangen pruefen",
    );
  },
  async zaehleScheiben() {
    return zaehleZeilen("inventory_plates", "Scheiben pruefen");
  },
  async zaehleKettlebells() {
    return zaehleZeilen("inventory_kettlebells", "Kettlebells pruefen");
  },
  async listUebungen() {
    return mustListe(
      await supabase
        .from("exercises")
        .select("id, key")
        .returns<SchluesselZeile[]>(),
      "Uebungskatalog lesen",
    );
  },

  async insertBausteine(rows) {
    must(await supabase.from("phase_types").insert(rows), "Bausteine anlegen");
  },
  async insertStangen(rows) {
    return mustZeilen(
      await supabase
        .from("inventory_bars")
        .insert(rows)
        .select("id, key")
        .returns<SchluesselZeile[]>(),
      "Stangen anlegen",
    );
  },
  async insertScheiben(rows) {
    must(
      await supabase.from("inventory_plates").insert(rows),
      "Scheiben anlegen",
    );
  },
  async insertKettlebells(rows) {
    must(
      await supabase.from("inventory_kettlebells").insert(rows),
      "Kettlebells anlegen",
    );
  },
  async insertUebungen(rows) {
    return mustZeilen(
      await supabase
        .from("exercises")
        .insert(rows)
        .select("id, key")
        .returns<SchluesselZeile[]>(),
      "Uebungen anlegen",
    );
  },
  async insertUebungsMuskeln(rows) {
    must(
      await supabase.from("exercise_muscles").insert(rows),
      "Muskel-Zuordnung anlegen",
    );
  },
  async insertVorlagen(rows) {
    return mustZeilen(
      await supabase
        .from("journey_templates")
        .insert(rows)
        .select("id, key")
        .returns<SchluesselZeile[]>(),
      "Journey-Vorlagen anlegen",
    );
  },
  async insertVorlagenPhasen(rows) {
    must(
      await supabase.from("journey_template_phases").insert(rows),
      "Vorlagen-Phasen anlegen",
    );
  },
  async insertSkills(rows) {
    return mustZeilen(
      await supabase
        .from("skills")
        .insert(rows)
        .select("id, key")
        .returns<SchluesselZeile[]>(),
      "Skills anlegen",
    );
  },
  async insertSkillPhasen(rows) {
    return mustZeilen(
      await supabase
        .from("skill_phases")
        .insert(rows)
        .select("id, skill_id, position")
        .returns<SkillPhaseZeile[]>(),
      "Skill-Phasen anlegen",
    );
  },
  async insertSkillUebungen(rows) {
    must(
      await supabase.from("skill_phase_exercises").insert(rows),
      "Skill-Uebungen anlegen",
    );
  },
  async insertSkillEquipment(rows) {
    must(
      await supabase.from("skill_phase_equipment").insert(rows),
      "Skill-Equipment anlegen",
    );
  },
  async insertEquipment(rows) {
    must(
      await supabase.from("inventory_equipment").insert(rows),
      "Equipment anlegen",
    );
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Eine im Test angelegte Zeile: die eingefuegten Felder plus die vergebene
 *  Kennung. Die Kennung ist vorhersagbar (`stange-1`, `uebung-3`), damit ein
 *  Test die Verknuepfungen nachrechnen kann. */
export type MemoryZeile<T> = T & { id: string };

/** Bestand des Test-Speichers: je Tabelle die angelegten Zeilen, dazu die
 *  Handgriffe in Aufrufreihenfolge. Beides zusammen ist das, was ein Test
 *  ueber die Erstbefuellung wissen will - was angelegt wird und wann. */
export interface MemorySeedLog {
  /** Jeder Handgriff in Aufrufreihenfolge, Lesen wie Schreiben. */
  handgriffe: string[];
  bausteine: PhaseTypeInsert[];
  stangen: Array<MemoryZeile<InventoryBarInsert>>;
  scheiben: InventoryPlateInsert[];
  kettlebells: InventoryKettlebellInsert[];
  uebungen: Array<MemoryZeile<ExerciseInsert>>;
  uebungsMuskeln: ExerciseMuscleInsert[];
  vorlagen: Array<MemoryZeile<JourneyTemplateInsert>>;
  vorlagenPhasen: JourneyTemplatePhaseInsert[];
  skills: Array<MemoryZeile<SkillInsert>>;
  skillPhasen: Array<MemoryZeile<SkillPhaseInsert>>;
  skillUebungen: SkillPhaseExerciseInsert[];
  skillEquipment: SkillPhaseEquipmentInsert[];
  equipment: InventoryEquipmentInsert[];
}

/** Haengt Zeilen an eine Liste und vergibt dabei fortlaufende Kennungen.
 *  Gibt genau die neu angelegten Zeilen zurueck - wie das `select` nach dem
 *  `insert` im Betrieb. */
function anlegen<T>(
  liste: Array<MemoryZeile<T>>,
  rows: T[],
  praefix: string,
): Array<MemoryZeile<T>> {
  const neu = rows.map((row, i) => ({
    ...row,
    id: `${praefix}-${String(liste.length + i + 1)}`,
  }));
  liste.push(...neu);
  return neu;
}

/** Erzeugt einen Erstbefuellungs-Speicher, der nichts schreibt, sondern jeden
 *  Handgriff protokolliert und den Bestand im Arbeitsspeicher haelt. Die
 *  Lesehandgriffe beantworten sich aus genau diesem Bestand - dadurch verhaelt
 *  sich ein zweiter Lauf wie auf einem bereits befuellten Konto. Ein Test kann
 *  den Bestand vorab fuellen, um ein Bestandskonto nachzustellen. */
export function createMemorySeedStore(): {
  store: SeedStore;
  log: MemorySeedLog;
} {
  const log: MemorySeedLog = {
    handgriffe: [],
    bausteine: [],
    stangen: [],
    scheiben: [],
    kettlebells: [],
    uebungen: [],
    uebungsMuskeln: [],
    vorlagen: [],
    vorlagenPhasen: [],
    skills: [],
    skillPhasen: [],
    skillUebungen: [],
    skillEquipment: [],
    equipment: [],
  };

  function merken(handgriff: string): void {
    log.handgriffe.push(handgriff);
  }

  const store: SeedStore = {
    async zaehleSkills() {
      merken("zaehleSkills");
      return log.skills.length;
    },
    async listBausteinSchluessel() {
      merken("listBausteinSchluessel");
      return log.bausteine.map((b) => b.key);
    },
    async listEquipmentSchluessel() {
      merken("listEquipmentSchluessel");
      return log.equipment.map((e) => e.key);
    },
    async listStangen() {
      merken("listStangen");
      return log.stangen.map((s) => ({ id: s.id, key: s.key ?? null }));
    },
    async zaehleScheiben() {
      merken("zaehleScheiben");
      return log.scheiben.length;
    },
    async zaehleKettlebells() {
      merken("zaehleKettlebells");
      return log.kettlebells.length;
    },
    async listUebungen() {
      merken("listUebungen");
      return log.uebungen.map((e) => ({ id: e.id, key: e.key ?? null }));
    },

    async insertBausteine(rows) {
      merken("insertBausteine");
      log.bausteine.push(...rows);
    },
    async insertStangen(rows) {
      merken("insertStangen");
      return anlegen(log.stangen, rows, "stange").map((s) => ({
        id: s.id,
        key: s.key ?? null,
      }));
    },
    async insertScheiben(rows) {
      merken("insertScheiben");
      log.scheiben.push(...rows);
    },
    async insertKettlebells(rows) {
      merken("insertKettlebells");
      log.kettlebells.push(...rows);
    },
    async insertUebungen(rows) {
      merken("insertUebungen");
      return anlegen(log.uebungen, rows, "uebung").map((e) => ({
        id: e.id,
        key: e.key ?? null,
      }));
    },
    async insertUebungsMuskeln(rows) {
      merken("insertUebungsMuskeln");
      log.uebungsMuskeln.push(...rows);
    },
    async insertVorlagen(rows) {
      merken("insertVorlagen");
      return anlegen(log.vorlagen, rows, "vorlage").map((v) => ({
        id: v.id,
        key: v.key ?? null,
      }));
    },
    async insertVorlagenPhasen(rows) {
      merken("insertVorlagenPhasen");
      log.vorlagenPhasen.push(...rows);
    },
    async insertSkills(rows) {
      merken("insertSkills");
      return anlegen(log.skills, rows, "skill").map((s) => ({
        id: s.id,
        key: s.key ?? null,
      }));
    },
    async insertSkillPhasen(rows) {
      merken("insertSkillPhasen");
      return anlegen(log.skillPhasen, rows, "skillphase").map((p) => ({
        id: p.id,
        skill_id: p.skill_id,
        position: p.position ?? 0,
      }));
    },
    async insertSkillUebungen(rows) {
      merken("insertSkillUebungen");
      log.skillUebungen.push(...rows);
    },
    async insertSkillEquipment(rows) {
      merken("insertSkillEquipment");
      log.skillEquipment.push(...rows);
    },
    async insertEquipment(rows) {
      merken("insertEquipment");
      log.equipment.push(...rows);
    },
  };

  return { store, log };
}
