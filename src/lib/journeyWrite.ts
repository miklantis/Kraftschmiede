// Schreib-Baustein rund um die Journey: der Journey-Start samt Phasen und
// Referenzgewichten, der Abschluss einer durchlaufenen Journey, das Umbenennen,
// die Uebernahme der Workout-Zuordnungen beim Journey-Wechsel, das
// Zuweisen/Herausnehmen einzelner Workouts und das Speichern bzw. Archivieren
// der Workout-Vorlagen – alles als duenne Folgen ueber der Naht JourneyStore.
// Beide Wege, auf denen eine Journey endet (Wechsel und Kalender-Abschluss),
// liegen damit hier und benutzen dieselben Handgriffe (Issue #379). Hier liegen die Absicht-zu-Handgriff-Zuordnung,
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

import { buildPhasePlans } from "@/engine";
import type {
  ArbeitsgewichtRow,
  BausteinBauregelRow,
  JourneyRowIns,
  JourneyStore,
  PhaseRowIns,
  VorlageUebungRow,
  ZuordnungRow,
} from "./journeyStore";
import { usesLoadPlan } from "./loadFactor";

/** Eine Phase der gewaehlten Journey-Vorlage, so wie sie in die neue Journey
 *  kopiert wird: nur die eingestellten Werte. Nutzer, Journey und Reihenfolge
 *  kommen erst beim Kopieren dazu, Listen und Bauart aus dem Baustein (siehe
 *  `phasenplaene`). */
export type JourneyStartPhase = Omit<
  PhaseRowIns,
  | "user_id"
  | "journey_id"
  | "position"
  | "plan_builder"
  | "load_builder"
  | "careful"
  | "week_plan"
  | "load_plan"
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
 * Wochenliste, Lastliste und Bauart-Vermerk einer entstehenden Phase: Alles
 * drei folgt aus dem Baustein und der Wochenzahl der Phase, nichts davon steht
 * in der Vorlage (Migrationen 0049 und 0050).
 *
 * Gebaut wird mit derselben Funktion, die auch `buildPhaseFromType` benutzt
 * (engine/phaseBuild.ts) – die Phase, die hier entsteht, kann darum nicht von
 * der abweichen, die der Seed aus demselben Baustein baut.
 */
function phasenplaene(
  baustein: BausteinBauregelRow,
  phase: Pick<JourneyStartPhase, "weeks">,
): Pick<
  PhaseRowIns,
  "week_plan" | "load_plan" | "plan_builder" | "load_builder" | "careful"
> {
  const gebaut = buildPhasePlans(
    {
      planBuilder: baustein.plan_builder,
      loadBuilder: baustein.load_builder,
      careful: baustein.careful,
      loadStartDefault: baustein.load_start_default,
      loadEndDefault: baustein.load_end_default,
    },
    phase.weeks,
  );
  return {
    week_plan: gebaut.weekPlan,
    load_plan: gebaut.loadPlan,
    plan_builder: gebaut.planBuilder,
    load_builder: gebaut.loadBuilder,
    careful: gebaut.careful,
  };
}

/** Gibt die Journey irgendwo eine Last vor? Nur dann wird beim Start ein
 *  Referenzgewicht eingefroren – es ist der Bezugspunkt, auf den sich die
 *  Anteile der Lastliste beziehen. Gefragt wird an den gebauten Phasen, nicht
 *  an der Vorlage: Nur dort steht die Lastliste ueberhaupt. */
function nutztLastliste(phases: PhaseRowIns[]): boolean {
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

/** Den heute gueltigen Workout-Namen in die Einheiten einer Journey einbrennen –
 *  der eine Handgriff fuers Ende einer Journey, gleich welcher Weg dorthin
 *  gefuehrt hat (ADR-0022). Danach erzaehlt die abgeschlossene Journey ihre
 *  eigene Geschichte: ein spaeteres Umbenennen des Workouts aendert an ihr
 *  nichts mehr.
 *
 *  Geschrieben wird je Workout einmal, nicht je Einheit – Postgres kann
 *  Spalte-auf-Spalte nur im SQL selbst, und eine Journey kennt eine Handvoll
 *  Workouts. Vorlagen, die es nicht mehr gibt, bleiben leer: einen Namen zu
 *  erfinden waere schlimmer als keiner. */
async function brenneWorkoutNamenEin(
  store: JourneyStore,
  journeyId: string,
): Promise<void> {
  const einheiten = await store.listJourneyEinheitenWorkouts(journeyId);
  const namen = new Map<string, string>();
  for (const e of einheiten) {
    if (e.name === null || e.name === "") continue;
    if (!namen.has(e.templateId)) namen.set(e.templateId, e.name);
  }
  await Promise.all(
    [...namen].map(([templateId, name]) =>
      store.setEinheitenWorkoutName(journeyId, templateId, name),
    ),
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
    // Erst einbrennen, dann archivieren: bricht das Einbrennen ab, bleibt die
    // bisherige Journey aktiv und der Wechsel laesst sich unveraendert
    // wiederholen.
    await brenneWorkoutNamenEin(store, previousJourneyId);
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
  // (`focus`), Bauart und beide Listen kommen von dort (Migrationen 0049 und
  // 0050). Genau hier entsteht die Phase - der einzige Ort, an dem
  // `phase_types` gelesen wird.
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
      // Hier friert die Journey ein, was die Vorlage nur ableitbar kannte:
      // Wochenliste, Lastliste und Bauart-Vermerk, gebaut aus dem Baustein und
      // der Wochenzahl dieser Phase. Ab jetzt traegt die Phasenzeile alles
      // selbst - Engine und Coach lesen im Training nur noch sie.
      ...phasenplaene(baustein, p),
      position: i,
    };
  });
  await store.insertPhasen(phaseRows);

  // Referenzgewicht: Bezugspunkt einer Journey, die die Last selbst vorgibt.
  // Traegt die Journey irgendwo eine Lastliste, den aktuellen Stand einfrieren
  // (work_weight wird nach jeder Einheit fortgeschrieben und waere sonst nach
  // der ersten abgesenkten Einheit verloren), sonst den alten Stand wegraeumen.
  if (nutztLastliste(phaseRows)) {
    await friereReferenzgewichteEin(store, userId);
  } else {
    await store.clearReferenzgewichte(userId);
  }

  return { newJourneyId, previousJourneyId };
}

/** Was der Abschluss braucht: welche Journey, und mit welchem Enddatum sie im
 *  Archiv steht (der Sonntag ihrer letzten geplanten Woche). */
export interface JourneyAbschlussPayload {
  journeyId: string;
  endDate: string;
}

/** Eine Journey beenden, weil sie durchlaufen ist (Kalender-Abschluss, #240):
 *  ins Archiv legen und die eingefrorenen Referenzgewichte wegraeumen - mit der
 *  Journey endet ihr Bezugspunkt, die naechste rechnet wieder aus der letzten
 *  Leistung.
 *
 *  Steht hier statt beim Verlauf, damit "eine Journey endet" an genau einer
 *  Stelle steht: derselbe Handgriff `clearReferenzgewichte`, den auch der
 *  Journey-Wechsel benutzt, raeumt Gewicht, Startgewicht und Phasenbezug
 *  zusammen weg (Issue #379). Zuvor lief der Kalender-Abschluss ueber eine
 *  zweite Fassung im Verlauf-Speicher, die den Phasenbezug stehen liess.
 *
 *  Zuerst brennt der Abschluss den Workout-Namen in die Einheiten ein und erst
 *  danach legt er die Journey ins Archiv: bricht der Vorgang dazwischen ab,
 *  bleibt die Journey aktiv, die Abschluss-Bedingung ist beim naechsten Oeffnen
 *  unveraendert wahr und der Vorgang holt sich selbst nach (ADR-0017).
 *
 *  Bewusst einfache Folge ohne Offline-Puffer (#240): der Abschluss ist keine
 *  Dateneingabe, sondern eine Schlussfolgerung aus Daten, die schon da sind.
 *  Schlaegt er fehl, ist die Bedingung beim naechsten Oeffnen unveraendert wahr
 *  und die Folge laeuft erneut - sie schreibt dabei dieselben Werte und bleibt
 *  deshalb folgenlos. */
export async function writeJourneyAbschluss(
  store: JourneyStore,
  userId: string | null,
  payload: JourneyAbschlussPayload,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");
  await brenneWorkoutNamenEin(store, payload.journeyId);
  await store.archiveJourney(payload.journeyId, payload.endDate);
  await store.clearReferenzgewichte(userId);
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
