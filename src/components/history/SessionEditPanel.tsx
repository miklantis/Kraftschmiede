import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { ExerciseLiveCard } from "@/components/live/ExerciseLiveCard";
import { SkillLiveCard } from "@/components/live/SkillLiveCard";
import { useSessionsDetailed } from "@/hooks/useSessionsDetailed";
import { useExercises } from "@/hooks/useExercises";
import { useSkills } from "@/hooks/useSkills";
import { useEditSession } from "@/hooks/useEditSession";
import type { HistorySessionInput, HistoryExercise } from "@/lib/history";
import type { SkillDefAssembled } from "@/hooks/useSkills";
import {
  withSetValue,
  withAppendedSet,
  withRemovedSet,
} from "@/lib/liveEntries";
import type { LiveEntry, LiveSet, SkillLiveExercise } from "@/lib/liveSession";

// Panel zum nachtraeglichen Korrigieren einer abgeschlossenen Einheit (Verlauf,
// Schritt 2a/2b). Wiederverwendet die Live-Karten im Bearbeiten-Modus – gleiche
// Optik wie waehrend des Trainings, aber ohne Ablauf (kein Timer/Haken/aktiver
// Satz, keine Stange/Scheiben/Stoppuhr, keine Aufwaermsaetze). Laeuft auf dem
// generischen Overlay (Desktop zentriert, Mobile Bodenblatt) wie „Yoga eintragen“.
//
// Kraft (2a) und Skill (2b) werden hier bearbeitet; Yoga folgt in 2c. Beim Skill
// bleibt der Phasen-Fortschritt bewusst unberuehrt – korrigiert wird nur der
// Eintrag.

// ---- Kraft-Entwurf ----------------------------------------------------------
// Die Saetze des Entwurfs haben bewusst dieselbe Form wie die der laufenden
// Einheit (LiveSet). Damit laufen Korrektur und Live-Erfassung durch dieselbe
// gepruefte Satz-Logik (lib/liveEntries.ts) statt durch zwei Nachbauten – die
// Fachregel „Gewicht weicht vom Ziel ab -> angepasst“ gilt hier wie dort.
interface PanelExercise {
  sessionExerciseId: string;
  exerciseId: string | null;
  name: string;
  sets: LiveSet[];
}

// ---- Skill-Entwurf ----------------------------------------------------------
interface SkillPanelExercise {
  sessionExerciseId: string;
  name: string;
  metric: "reps" | "duration";
  target: number;
  values: number[];
}

type PanelDraft =
  | { type: "strength"; date: string; minutes: number; exercises: PanelExercise[] }
  | { type: "skill"; date: string; minutes: number; exercises: SkillPanelExercise[] }
  | { type: "yoga"; date: string; minutes: number; notes: string };

function minutesOf(input: HistorySessionInput): number {
  return input.durationSec ? Math.round(input.durationSec / 60) : 0;
}

// ---- Kraft-Aufbau -----------------------------------------------------------
function workSetsOf(ex: HistoryExercise): LiveSet[] {
  return ex.sets
    .filter((s) => s.kind !== "warmup")
    .map((s) => {
      const reps = s.reps ?? 0;
      const weight = s.weight ?? 0;
      return {
        reps,
        weight,
        score: s.score ?? 3,
        targetReps: s.targetReps ?? reps,
        targetWeight: s.targetWeight ?? weight,
        // Kein Ablauf im Bearbeiten-Modus: kein Haken, kein aktiver Satz.
        done: false,
        // `failed` wird angezeigt wie gespeichert, aber nie zurueckgeschrieben –
        // die Korrektur kennt kein Versagen (setResult.ts).
        failed: s.failed ?? false,
        // Der gespeicherte Vermerk bleibt stehen, statt beim Oeffnen zu
        // verschwinden.
        adjusted: s.adjusted ?? false,
        adjustNote: s.adjustNote ?? "",
      };
    });
}

function buildStrengthDraft(
  input: HistorySessionInput,
  exName: (id: string) => string | undefined,
): PanelDraft {
  const exercises = input.exercises
    .slice()
    .sort((a, b) => a.position - b.position)
    .filter((ex) => ex.sessionExerciseId != null)
    .map((ex) => ({
      sessionExerciseId: ex.sessionExerciseId as string,
      exerciseId: ex.exerciseId,
      name:
        (ex.exerciseId ? exName(ex.exerciseId) : undefined) || ex.name || "Übung",
      sets: workSetsOf(ex),
    }));
  return { type: "strength", date: input.date, minutes: minutesOf(input), exercises };
}

// ---- Skill-Aufbau -----------------------------------------------------------
function buildSkillDraft(
  input: HistorySessionInput,
  skills: SkillDefAssembled[],
): PanelDraft {
  const skill = skills.find((s) => s.id === input.skillId) ?? null;
  const phase = skill?.phases[input.skillPhase ?? 0] ?? null;

  const exercises = input.exercises
    .slice()
    .sort((a, b) => a.position - b.position)
    .filter((ex) => ex.sessionExerciseId != null)
    .map((ex) => {
      const planEx = phase?.exercises[ex.position] ?? null;
      const metric: "reps" | "duration" =
        ex.metric ?? planEx?.metric ?? "reps";
      const work = ex.sets.filter((s) => s.kind !== "warmup");
      const target =
        planEx?.target ?? work[0]?.targetReps ?? 0;
      const values = work.map((s) =>
        metric === "duration" ? s.durationSec ?? 0 : s.reps ?? 0,
      );
      return {
        sessionExerciseId: ex.sessionExerciseId as string,
        name: ex.name || planEx?.name || "Übung",
        metric,
        target,
        values,
      };
    });
  return { type: "skill", date: input.date, minutes: minutesOf(input), exercises };
}

function buildDraft(
  input: HistorySessionInput,
  exName: (id: string) => string | undefined,
  skills: SkillDefAssembled[],
): PanelDraft {
  if (input.type === "skill") return buildSkillDraft(input, skills);
  if (input.type === "yoga") {
    return {
      type: "yoga",
      date: input.date,
      minutes: input.minutes ?? 0,
      notes: input.notes ?? "",
    };
  }
  return buildStrengthDraft(input, exName);
}

// ---- Karten-Adapter ---------------------------------------------------------
/** Nur noch der Kartenrahmen: die Saetze liegen bereits in der Live-Form vor.
 *  Dient zugleich als Huelle fuer die Satz-Logik aus lib/liveEntries.ts. */
function toLiveEntry(ex: PanelExercise): LiveEntry {
  return {
    exerciseId: ex.exerciseId ?? "",
    exerciseName: ex.name,
    equipment: "bodyweight", // neutral: keine Stange/Scheiben im Bearbeiten-Modus
    tag: "",
    barId: null,
    barName: null,
    barWeight: null,
    warmupSets: [],
    sets: ex.sets,
    // Notizen im Verlauf haengt Schritt 3 von Vorhaben #136 an.
    note: "",
  };
}

function toSkillExercise(ex: SkillPanelExercise): SkillLiveExercise {
  return {
    name: ex.name,
    // Im Bearbeiten-Modus wird nichts verlinkt, daher keine Katalog-Uebung.
    exerciseId: null,
    metric: ex.metric,
    target: ex.target,
    tempo: null,
    sets: ex.values.map((v) => ({ value: v, done: false, met: false })),
  };
}

export function SessionEditPanel({
  sessionId,
  title,
  dateLabel,
  open,
  onClose,
}: {
  sessionId: string | null;
  /** Anzeigename der Einheit (z. B. „Workout Oberkoerper“) fuer den Kopf. */
  title?: string;
  /** Datum der Einheit (z. B. „Mo., 22. Juni“) fuer den Kopf. */
  dateLabel?: string;
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const detailedQ = useSessionsDetailed();
  const exercisesQ = useExercises();
  const skillsQ = useSkills();
  const edit = useEditSession();

  const [draft, setDraft] = useState<PanelDraft | null>(null);
  // Sobald der Nutzer etwas aendert, gilt der Entwurf als „angefasst“ und wird
  // nicht mehr aus den (ggf. nachladenden) Daten ueberschrieben.
  const [dirty, setDirty] = useState(false);

  const input =
    sessionId != null
      ? (detailedQ.data ?? []).find((s) => s.id === sessionId) ?? null
      : null;

  // Entwurf aus den gespeicherten Werten aufbauen. Solange der Nutzer nichts
  // geaendert hat (!dirty), wird er bei jeder frischen Datenlieferung neu
  // aufgebaut – so verschwindet das „nicht bearbeitbar“ von selbst, sobald der
  // (anfangs evtl. veraltete) Verlauf frisch nachgeladen ist. Schliessen setzt
  // alles zurueck.
  useEffect(() => {
    if (!open) {
      setDraft(null);
      setDirty(false);
      return;
    }
    if (input && !dirty) {
      const exName = new Map((exercisesQ.data ?? []).map((e) => [e.id, e.name]));
      setDraft(buildDraft(input, (id) => exName.get(id), skillsQ.data ?? []));
    }
  }, [open, input, dirty, exercisesQ.data, skillsQ.data]);

  function touch(): void {
    setDirty(true);
  }

  function setMinutes(value: number): void {
    touch();
    setDraft((d) => (d ? { ...d, minutes: Math.max(0, value) } : d));
  }

  function setNotes(value: string): void {
    touch();
    setDraft((d) => (d && d.type === "yoga" ? { ...d, notes: value } : d));
  }

  // --- Kraft-Mutationen ---
  function setKraftExercises(
    fn: (exs: PanelExercise[]) => PanelExercise[],
  ): void {
    touch();
    setDraft((d) =>
      d && d.type === "strength" ? { ...d, exercises: fn(d.exercises) } : d,
    );
  }
  /** Die Satz-Logik der laufenden Einheit auf den Entwurf anwenden: Uebungen als
   *  Live-Eintraege einpacken, Regel anwenden, geaenderte Saetze zurueckschreiben.
   *  Unveraenderte Uebungen behalten ihre Referenz (liveEntries gibt dieselben
   *  Saetze zurueck), damit nur die betroffene Karte neu rendert. */
  function withLiveEntries(fn: (entries: LiveEntry[]) => LiveEntry[]): void {
    setKraftExercises((exs) => {
      const next = fn(exs.map(toLiveEntry));
      return exs.map((ex, i) =>
        next[i].sets === ex.sets ? ex : { ...ex, sets: next[i].sets },
      );
    });
  }
  function updateSet(
    ei: number,
    si: number,
    kind: "reps" | "weight" | "score",
    value: number,
  ): void {
    // istRmTest ist im Verlauf immer false: ein 1RM-Test ist keine Einheit und
    // wird hier nicht bearbeitet.
    withLiveEntries((entries) =>
      withSetValue(entries, ei, si, kind, value, false),
    );
  }
  function addSet(ei: number): void {
    withLiveEntries((entries) => withAppendedSet(entries, ei));
  }
  function delSet(ei: number): void {
    withLiveEntries((entries) => withRemovedSet(entries, ei));
  }

  // --- Skill-Mutationen ---
  function setSkillExercises(
    fn: (exs: SkillPanelExercise[]) => SkillPanelExercise[],
  ): void {
    touch();
    setDraft((d) =>
      d && d.type === "skill" ? { ...d, exercises: fn(d.exercises) } : d,
    );
  }
  function updateSkillValue(ei: number, si: number, value: number): void {
    setSkillExercises((exs) =>
      exs.map((ex, i) =>
        i !== ei
          ? ex
          : { ...ex, values: ex.values.map((v, j) => (j !== si ? v : value)) },
      ),
    );
  }
  function addSkillSet(ei: number): void {
    setSkillExercises((exs) =>
      exs.map((ex, i) => {
        if (i !== ei) return ex;
        const last = ex.values[ex.values.length - 1];
        const next = last ?? ex.target ?? 0;
        return { ...ex, values: [...ex.values, next] };
      }),
    );
  }
  function delSkillSet(ei: number): void {
    setSkillExercises((exs) =>
      exs.map((ex, i) =>
        i !== ei || ex.values.length <= 1 ? ex : { ...ex, values: ex.values.slice(0, -1) },
      ),
    );
  }

  function save(): void {
    if (!draft || !sessionId) return;
    const durationSec = draft.minutes > 0 ? draft.minutes * 60 : null;
    if (draft.type === "yoga") {
      edit.saveYoga({ sessionId, minutes: draft.minutes, notes: draft.notes });
    } else if (draft.type === "skill") {
      edit.saveSkill({
        sessionId,
        durationSec,
        exercises: draft.exercises.map((ex) => ({
          sessionExerciseId: ex.sessionExerciseId,
          metric: ex.metric,
          target: ex.target,
          values: ex.values,
        })),
      });
    } else {
      edit.save({
        sessionId,
        date: draft.date,
        durationSec,
        exercises: draft.exercises.map((ex) => ({
          sessionExerciseId: ex.sessionExerciseId,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
        })),
      });
    }
    onClose();
  }

  const loadingOrFetching = detailedQ.isFetching || skillsQ.isFetching;
  // Yoga ist immer bearbeitbar (Minuten + Notiz); Kraft/Skill brauchen Saetze.
  const editable =
    draft != null && (draft.type === "yoga" || draft.exercises.length > 0);

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title ?? "Einheit bearbeiten"}
      headerTrailing={
        dateLabel ? (
          <span className="flex-none text-[12px] whitespace-nowrap text-muted-foreground">
            {dateLabel}
          </span>
        ) : undefined
      }
    >
      {!draft || (!editable && loadingOrFetching) ? (
        <p className="py-4 text-[14px] text-muted-foreground">Wird geladen …</p>
      ) : !editable ? (
        <p className="py-4 text-[14px] text-muted-foreground">
          Diese Einheit lässt sich hier nicht bearbeiten.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="-mt-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
            Einheit bearbeiten
          </div>

          {/* Dauer (Minuten) */}
          <div className="flex items-center justify-between rounded-control bg-muted px-4 py-2.5">
            <span className="text-[13px] font-semibold text-muted-foreground">Dauer</span>
            <span className="flex items-baseline gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                aria-label="Dauer in Minuten"
                className="h-[26px] w-[64px] rounded-[8px] bg-card px-2 text-right font-mono text-[16px] font-semibold text-foreground shadow-card outline-none focus:ring-2 focus:ring-primary/40"
                value={String(draft.minutes)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setMinutes(Number.isNaN(n) ? 0 : n);
                }}
              />
              <span className="text-[13px] font-medium text-muted-foreground">min</span>
            </span>
          </div>

          {/* Uebungen als Live-Karten im Bearbeiten-Modus; Yoga: Notiz */}
          {draft.type === "strength"
            ? draft.exercises.map((ex, ei) => (
                <ExerciseLiveCard
                  key={ex.sessionExerciseId}
                  entry={toLiveEntry(ex)}
                  ei={ei}
                  active={null}
                  plateMode={0}
                  plates={[]}
                  bars={[]}
                  unit="kg"
                  editMode
                  onToggleWarm={() => {}}
                  onToggleSet={() => {}}
                  onWarmValue={() => {}}
                  onSetValue={(si, kind, value) => updateSet(ei, si, kind, value)}
                  onAddSet={() => addSet(ei)}
                  onDelSet={() => delSet(ei)}
                  onChangeBar={() => {}}
                  onCyclePlate={() => {}}
                />
              ))
            : draft.type === "skill"
            ? draft.exercises.map((ex, ei) => (
                <SkillLiveCard
                  key={ex.sessionExerciseId}
                  exercise={toSkillExercise(ex)}
                  watchSi={null}
                  editMode
                  onToggleSet={() => {}}
                  onValue={(si, value) => updateSkillValue(ei, si, value)}
                  onStartWatch={() => {}}
                  onStopWatch={() => {}}
                  onAddSet={() => addSkillSet(ei)}
                  onDelSet={() => delSkillSet(ei)}
                />
              ))
            : (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    Notiz
                  </span>
                  <textarea
                    aria-label="Notiz"
                    rows={4}
                    placeholder="z. B. Schwerpunkt, Stimmung, Besonderheiten …"
                    className="w-full resize-none rounded-control border border-border bg-card px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-primary"
                    value={draft.notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={edit.isSaving}
              className="w-full rounded-control bg-primary py-3 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105 disabled:opacity-50"
            >
              {edit.isSaving ? "Speichern …" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-[14px] font-medium text-muted-foreground"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}
