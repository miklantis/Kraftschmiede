// Schreib-Baustein rund um die Journey: der Journey-Start samt Phasen und
// Referenzgewichten, das Umbenennen, die Uebernahme der Workout-Zuordnungen
// beim Journey-Wechsel, das Zuweisen/Herausnehmen einzelner Workouts und das
// Speichern bzw. Archivieren der Workout-Vorlagen – alles als duenne Folgen
// ueber der Naht JourneyStore. Hier liegen die Absicht-zu-Handgriff-Zuordnung,
// die Reihenfolge mehrstufiger Ablaeufe und die Anmeldepruefung – an einem Ort.
// Das eigentliche Schreiben und Fehlerwerfen macht der uebergebene Speicher.
//
// Haengt nur an der Naht (Typ JourneyStore) und an den Schema-Typen, kennt
// Supabase nicht. Dadurch mit einem Speicher im Arbeitsspeicher pruefbar.
//
// Was hier bewusst NICHT liegt: die Registrierung der pausierbaren Mutationen
// und ihre Reihenfolge (ADR-0009). Die bleibt unveraendert in
// `journeyWorkoutActions.ts`, `templateActions.ts` und `queryClient.ts`; diese
// Datei liefert nur den Rumpf, den deren mutationFn aufruft.
//
// ADR-0004 bleibt ebenfalls unberuehrt: dass es genau eine aktive Journey gibt,
// sichert die Datenbank. Der Ablauf hier loest die bisherige nur zuerst ab,
// damit der Unique-Index beim Einfuegen nicht verletzt wird.

import type {
  ArbeitsgewichtRow,
  BausteinBauartRow,
  JourneyRowIns,
  JourneyStore,
  PhaseRowIns,
  VorlageUebungRow,
  ZuordnungRow,
} from "./journeyStore";
import { usesLoadPlan } from "./loadFactor";

/** Eine Phase der gewaehlten Journey-Vorlage, so wie sie in die neue Journey
 *  kopiert wird. Nutzer, Journey und Reihenfolge kommen erst beim Kopieren
 *  dazu – der Bauart-Vermerk aus dem Baustein (siehe `bauartFuerPhase`). */
export type JourneyStartPhase = Omit<
  PhaseRowIns,
  | "user_id"
  | "journey_id"
  | "position"
  | "plan_builder"
  | "load_builder"
  | "careful"
>;

/** Der Bauart-Vermerk, den eine entstehende Phase mitbekommt. */
export type PhasenBauart = Pick<
  PhaseRowIns,
  "plan_builder" | "load_builder" | "careful"
>;

/** Die gewaehlte Journey-Vorlage, auf das reduziert, was der Start braucht. */
export interface JourneyStartVorlage {
  id: string;
  name: string;
  phases: JourneyStartPhase[];
}

/** Was beim Start herauskommt: die neue Journey und – falls es eine gab – die
 *  abgeloeste, deren Zuordnungen zur Uebernahme angeboten werden. */
export interface JourneyStartErgebnis {
  newJourneyId: string;
  previousJourneyId: string | null;
}

/** Was der Nutzer mit der Zuordnung eines Workouts zur aktiven Journey will.
 *  `assign` bringt die Id bereits mit, damit ein ohne Netz gesetzter Schalter
 *  spaeter unveraendert nachgeschickt werden kann. */
export type ZuordnungAction =
  | {
      type: "assign";
      id: string;
      userId: string;
      journeyId: string;
      templateId: string;
    }
  | { type: "unassign"; journeyId: string; templateId: string };

/** Eine Uebung im Speicher-Paket einer Workout-Vorlage (Id bereits vergeben). */
export interface VorlageUebung {
  id: string;
  exercise_id: string;
  position: number;
}

/** Was der Nutzer mit einer Workout-Vorlage will. `save` traegt Kopf und
 *  vollstaendige Uebungsliste, `setActive` nur den Archiv-Schalter. */
export type VorlageAction =
  | {
      type: "save";
      userId: string;
      templateId: string;
      name: string;
      isNew: boolean;
      position: number;
      exercises: VorlageUebung[];
    }
  | { type: "setActive"; templateId: string; aktiv: boolean };

/**
 * Bauart-Vermerk einer entstehenden Phase: Er kommt aus dem Baustein, aber nur
 * dort, wo die Phase die zugehoerige Liste auch traegt. Ein Vermerk ohne Liste
 * wuerde den Coach eine Rampe lesen lassen, die es nicht gibt.
 *
 * Dieselbe Regel wie in `buildPhaseFromType` (engine/phaseBuild.ts), nur von
 * der anderen Seite: dort entstehen Liste und Vermerk gemeinsam, hier trifft
 * der Vermerk auf eine bereits gebaute Liste der Vorlage. `careful` haengt an
 * keiner Liste und kommt unveraendert aus dem Baustein.
 */
export function bauartFuerPhase(
  baustein: BausteinBauartRow,
  phase: Pick<JourneyStartPhase, "load_plan" | "week_plan">,
): PhasenBauart {
  return {
    plan_builder: phase.week_plan == null ? null : baustein.plan_builder,
    load_builder: phase.load_plan == null ? null : baustein.load_builder,
    careful: baustein.careful,
  };
}

/** Gibt die Vorlage irgendwo eine Last vor? Nur dann wird beim Start ein
 *  Referenzgewicht eingefroren – es ist der Bezugspunkt, auf den sich die
 *  Anteile der Lastliste beziehen. Traegt keine Phase eine Liste, gibt es
 *  nichts einzufrieren. */
function nutztLastliste(phases: JourneyStartPhase[]): boolean {
  return usesLoadPlan(phases.map((p) => p.load_plan));
}

/** Referenzgewicht aller Uebungen des Nutzers auf den aktuellen Stand
 *  einfrieren. Postgres kann Spalte-auf-Spalte nur im SQL selbst; ueber die
 *  Naht wird darum je Zeile geschrieben (Uebungskatalog eines Nutzers,
 *  zweistellig). */
async function friereReferenzgewichteEin(
  store: JourneyStore,
  userId: string,
): Promise<void> {
  const rows: ArbeitsgewichtRow[] = await store.listArbeitsgewichte(userId);
  await Promise.all(
    rows.map((r) => store.setReferenzgewicht(r.id, r.work_weight)),
  );
}

/** Eine neue Journey aus einer Vorlage starten. Die Reihenfolge ist Teil der
 *  Absicht: erst die bisherige aktive Journey abloesen (sonst verletzt das
 *  Einfuegen den Unique-Index), dann die neue Journey, dann ihre Phasen, zum
 *  Schluss die Referenzgewichte. `heute` kommt von aussen, damit der Ablauf
 *  ohne Uhr pruefbar bleibt. */
export async function writeJourneyStart(
  store: JourneyStore,
  userId: string | null,
  vorlage: JourneyStartVorlage,
  heute: string,
): Promise<JourneyStartErgebnis> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  // Die abgeloeste Journey behaelt ihre Zuordnungen (nur active=false), ihre Id
  // traegt das Uebernahme-Angebot.
  const previousJourneyId = await store.findActiveJourneyId();
  if (previousJourneyId !== null) {
    await store.archiveJourney(previousJourneyId, heute);
  }

  const row: JourneyRowIns = {
    user_id: userId,
    name: vorlage.name,
    active: true,
    status: "active",
    source_template_id: vorlage.id,
    start_date: heute,
  };
  const newJourneyId = await store.insertJourney(row);

  // Bausteine einmal lesen: Die Vorlagenphase nennt nur ihren Baustein
  // (`focus`), der Bauart-Vermerk kommt von dort (Migration 0049). Genau hier
  // entsteht die Phase - der einzige Ort, an dem `phase_types` gelesen wird.
  const bausteine = await store.listBausteine(userId);
  const bausteinNach = new Map(bausteine.map((b) => [b.key, b]));

  const phaseRows: PhaseRowIns[] = vorlage.phases.map((p, i) => {
    const baustein = bausteinNach.get(p.focus);
    // Kann nicht passieren, solange der Fremdschluessel aus Migration 0048
    // steht - aber lieber ein klarer Abbruch als eine Journey ohne Bauart.
    if (baustein === undefined) {
      throw new Error(`Kein Baustein fuer die Phase "${p.name}" (${p.focus}).`);
    }
    return {
      user_id: userId,
      journey_id: newJourneyId,
      name: p.name,
      focus: p.focus,
      weeks: p.weeks,
      sets_start: p.sets_start,
      sets_end: p.sets_end,
      deload_week: p.deload_week,
      rep_target_min: p.rep_target_min,
      rep_target_max: p.rep_target_max,
      load_plan: p.load_plan,
      // Der Wochenplan der Vorlage wandert unveraendert in die Journey mit; ohne
      // ihn liefe eine frisch gestartete Kraftphase wieder frei ueber den Coach.
      week_plan: p.week_plan,
      // Der Bauart-Vermerk dagegen kommt aus dem Baustein: ohne ihn wuesste die
      // Journey nicht mehr, ob ihr Wochenplan die Last hochfaehrt oder entlastet.
      ...bauartFuerPhase(baustein, p),
      position: i,
    };
  });
  await store.insertPhasen(phaseRows);

  // Referenzgewicht: Bezugspunkt einer Journey, die die Last selbst vorgibt.
  // Traegt die Journey irgendwo eine Lastliste, den aktuellen Stand einfrieren
  // (work_weight wird nach jeder Einheit fortgeschrieben und waere sonst nach
  // der ersten abgesenkten Einheit verloren), sonst den alten Stand wegraeumen.
  if (nutztLastliste(vorlage.phases)) {
    await friereReferenzgewichteEin(store, userId);
  } else {
    await store.clearReferenzgewichte(userId);
  }

  return { newJourneyId, previousJourneyId };
}

/** Die zugewiesenen Workout-Ids einer Journey lesen (fuer das
 *  Uebernahme-Angebot beim Wechsel). */
export async function readJourneyZuordnungen(
  store: JourneyStore,
  journeyId: string,
): Promise<string[]> {
  return store.listZuordnungen(journeyId);
}

/** Zuordnungen in die neue Journey kopieren (Uebernahme beim Wechsel). Nur die
 *  uebergebenen (bereits auf zuweisbar gefilterten) Workouts; Ids clientseitig,
 *  damit der Schritt offline unveraendert nachgeschickt werden kann. */
export async function writeJourneyZuordnungUebernahme(
  store: JourneyStore,
  userId: string | null,
  newJourneyId: string,
  templateIds: string[],
  neueId: () => string,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");
  if (templateIds.length === 0) return;
  const rows: ZuordnungRow[] = templateIds.map((templateId) => ({
    id: neueId(),
    user_id: userId,
    journey_id: newJourneyId,
    template_id: templateId,
  }));
  await store.insertZuordnungen(rows);
}

/** Eine Journey umbenennen. */
export async function writeJourneyRename(
  store: JourneyStore,
  journeyId: string,
  name: string,
): Promise<void> {
  await store.renameJourney(journeyId, name);
}

/** Ein Workout der aktiven Journey zuweisen oder herausnehmen. */
export async function writeZuordnungAction(
  store: JourneyStore,
  action: ZuordnungAction,
): Promise<void> {
  if (action.type === "assign") {
    await store.insertZuordnungen([
      {
        id: action.id,
        user_id: action.userId,
        journey_id: action.journeyId,
        template_id: action.templateId,
      },
    ]);
    return;
  }
  await store.deleteZuordnung(action.journeyId, action.templateId);
}

/** Eine Workout-Vorlage speichern oder archivieren/reaktivieren. Beim Speichern
 *  zaehlt die Reihenfolge: erst der Kopf (anlegen oder umbenennen), dann die
 *  Uebungsliste sauber ersetzen (loeschen, dann neu einfuegen). Das Ersetzen ist
 *  unbedenklich, da die Uebungsliste nur das Rezept ist und der Verlauf beim
 *  Start kopiert. */
export async function writeVorlageAction(
  store: JourneyStore,
  action: VorlageAction,
): Promise<void> {
  if (action.type === "setActive") {
    await store.setVorlageAktiv(action.templateId, action.aktiv);
    return;
  }

  if (action.isNew) {
    await store.insertVorlage({
      id: action.templateId,
      user_id: action.userId,
      key: null,
      name: action.name,
      image: null,
      active: true,
      position: action.position,
    });
  } else {
    await store.renameVorlage(action.templateId, action.name);
  }

  await store.deleteVorlageUebungen(action.templateId);

  if (action.exercises.length > 0) {
    const rows: VorlageUebungRow[] = action.exercises.map((e) => ({
      id: e.id,
      user_id: action.userId,
      template_id: action.templateId,
      exercise_id: e.exercise_id,
      position: e.position,
    }));
    await store.insertVorlageUebungen(rows);
  }
}
