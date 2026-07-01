import { useMemo } from "react";
import {
  journeyPlacement,
  weekProgress,
  skillAdvice,
  type Exercise,
} from "@/engine";
import {
  buildSuitabilityCtx,
  rankWorkouts,
  type DoneSessionEntry,
} from "@/lib/coach";
import { focusLabel } from "@/lib/labels";
import {
  isJourneyCapable,
  selectRecommendationTemplates,
} from "@/lib/workouts";
import { longDateDE, todayISO } from "@/lib/format";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useSessions } from "./useSessions";
import { useActiveJourney } from "./useJourney";
import { useJourneyWorkouts } from "./useJourneyWorkouts";
import { useSkills, useSkillProgress } from "./useSkills";
import { useSettings } from "./useSettings";
import { useOwnedEquipmentKeys } from "./useInventory";
import { useLatestBody } from "./useBody";

// Anzeigefertiges Modell der Trainings-Uebersicht. Reine Daten – die Komponenten
// kennen weder Supabase noch die Engine.
export interface WorkoutCard {
  id: string;
  name: string;
  lifts: string;
  exerciseNames: string[];
  score: number;
  excluded: boolean;
  /** Ist der aktiven Journey zugewiesen (nutzbar) – steuert Chip + Score in der
   *  Liste „Weitere Workouts“. */
  inJourney: boolean;
}

export interface SkillCard {
  id: string;
  name: string;
  subtitle: string;
  gated: boolean;
}

export interface TrainingOverview {
  date: string;
  journey: {
    title: string;
    subtitle: string;
    filled: number;
    total: number;
  } | null;
  hero: WorkoutCard | null;
  others: WorkoutCard[];
  /** Empfehlung faellt mangels nutzbarer Journey-Zuweisung auf die ganze
   *  Bibliothek zurueck – dezenter Hinweis auf der Trainingsseite. */
  libraryFallbackHint: boolean;
  skills: SkillCard[];
  yogaSubtitle: string;
}

// Bezieht alle noetigen Entitaeten und setzt sie ueber Coach und Journey-Engine
// zur Uebersicht zusammen. Score und Ausschluss kommen aus echter Logik, hier
// aber nur als Anzeige – kein Eingriff.
export function useTrainingOverview(): {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: TrainingOverview | null;
} {
  const exercisesQ = useExercises();
  const templatesQ = useTemplates();
  const sessionsQ = useSessions();
  const journeyQ = useActiveJourney();
  const journeyWorkoutsQ = useJourneyWorkouts(journeyQ.data?.id ?? null);
  const skillsQ = useSkills();
  const progressQ = useSkillProgress();
  const settingsQ = useSettings();
  const equipmentQ = useOwnedEquipmentKeys();
  const bodyQ = useLatestBody();

  const queries = [
    exercisesQ,
    templatesQ,
    sessionsQ,
    journeyQ,
    journeyWorkoutsQ,
    skillsQ,
    progressQ,
    settingsQ,
    equipmentQ,
    bodyQ,
  ];

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const data = useMemo<TrainingOverview | null>(() => {
    if (isLoading || isError) return null;

    const exercises = exercisesQ.data ?? [];
    const templates = templatesQ.data ?? [];
    const sessions = sessionsQ.data ?? [];
    const journey = journeyQ.data ?? null;
    const assignedIds = journeyWorkoutsQ.data ?? [];
    const skills = skillsQ.data ?? [];
    const progress = progressQ.data ?? [];
    const settings = settingsQ.data ?? null;
    const ownedKeys = equipmentQ.data ?? [];
    const body = bodyQ.data;

    const today = todayISO();
    const freqTarget = settings?.weekly_frequency_target || 3;

    // Uebungs-Lookup fuer Engine-Kontext und Lift-Namen.
    const exMap: Record<string, Exercise> = {};
    const nameById: Record<string, string> = {};
    exercises.forEach((e) => {
      exMap[e.id] = {
        id: e.id,
        name: e.name,
        tier: e.tier,
        profile: e.profile,
        muscleGroups: e.muscle_groups,
        recoveryHours: e.recovery_hours,
      };
      nameById[e.id] = e.name;
    });

    const liftsOf = (ids: string[]): string =>
      ids.map((id) => nameById[id] ?? id).join(" · ");

    // Abgeschlossene Einheiten fuer Recency/Wochenbalance.
    const done: DoneSessionEntry[] = sessions
      .filter((s) => s.status === "done")
      .map((s) => ({ date: s.date, exerciseIds: s.exerciseIds }));

    // Aktuelle Phase aus der Platzierung.
    let phaseFocus: { focus?: string } | null = null;
    let journeyView: TrainingOverview["journey"] = null;
    if (journey) {
      const placement = journeyPlacement(
        { id: journey.id, phases: journey.phases },
        sessions.map((s) => ({
          date: s.date,
          status: s.status,
          type: s.type,
          journeyId: s.journey_id,
        })),
        freqTarget,
        today,
      );
      const currentPhase = journey.phases[placement.phaseIndex] ?? null;
      phaseFocus = currentPhase ? { focus: currentPhase.focus } : null;

      const wp = weekProgress(
        sessions.map((s) => ({
          date: s.date,
          status: s.status,
          type: s.type,
          journeyId: s.journey_id,
        })),
        journey.id,
        freqTarget,
        today,
      );
      const phaseWeeks = currentPhase?.weeks ?? "?";
      const focusName = currentPhase
        ? focusLabel(currentPhase.focus) || currentPhase.name
        : "";
      journeyView = {
        title: journey.name + (focusName ? " · " + focusName : ""),
        subtitle:
          "Woche " +
          placement.weekInPhase +
          " von " +
          phaseWeeks +
          " · " +
          wp.units +
          " von " +
          wp.target +
          " Einheiten diese Woche",
        filled: wp.units,
        total: wp.target,
      };
    }

    // Konzept 5.4 + Verfeinerung: „Heute empfohlen“ (Hero) kommt aus der
    // Journey-Zuweisung (Rueckfall auf die Bibliothek bei leerer Zuweisung, mit
    // Hinweis); „Weitere Workouts“ zeigt dagegen alle aktiven Workouts, damit
    // jedes frei startbar bleibt. Journey-Faehigkeit braucht das Profil je
    // Uebung; dafuer ein schlankes Nachschlagewerk.
    const profileLookup: Record<string, { name: string; profile: string }> = {};
    exercises.forEach((e) => {
      profileLookup[e.id] = { name: e.name, profile: e.profile };
    });
    const selection = selectRecommendationTemplates(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        active: t.active,
        exercises: t.exercises,
      })),
      profileLookup,
      journey !== null,
      new Set(assignedIds),
    );
    const selectedIds = new Set(selection.ids);

    // Menge der Workouts, die der aktiven Journey zugewiesen und dort nutzbar
    // sind (aktiv + journey-faehig). Nur diese bekommen in „Weitere Workouts“
    // den Journey-Chip und ihren Score; ohne aktive Journey ist die Menge leer.
    const assignedSet = new Set(assignedIds);
    const assignedUsableIds = new Set(
      templates
        .filter(
          (t) =>
            t.active &&
            assignedSet.has(t.id) &&
            isJourneyCapable(
              {
                id: t.id,
                name: t.name,
                active: t.active,
                exercises: t.exercises,
              },
              profileLookup,
            ),
        )
        .map((t) => t.id),
    );

    // Coach-Kontext.
    const ctx = buildSuitabilityCtx({
      now: Date.now(),
      done,
      today,
      body: {
        legs: body?.legs ?? 0,
        upper_body: body?.upper_body ?? 0,
        overall: body?.overall ?? 0,
        readiness: body?.readiness ?? 3,
      },
      phase: phaseFocus,
      freqTarget,
    });

    // Coach-Ranking ALLER aktiven Workouts nach Eignung. Der Hero kommt aus der
    // Journey-Auswahl (selectedIds; Konzept 5.4); die uebrigen aktiven Workouts
    // erscheinen als „Weitere“ – unabhaengig von der Zuordnung, damit jedes
    // Workout direkt startbar bleibt. Ausschluss (Kater=3) dimmt und sperrt den
    // Start bei allen gleichermassen.
    const ranked = rankWorkouts(
      templates
        .filter((t) => t.active)
        .map((t) => ({ id: t.id, exerciseIds: t.exerciseIds })),
      ctx,
      exMap,
    );
    const cardFor = (r: (typeof ranked)[number]): WorkoutCard => {
      const tpl = templates.find((t) => t.id === r.template.id);
      return {
        id: r.template.id,
        name: tpl?.name ?? r.template.id,
        lifts: liftsOf(r.template.exerciseIds),
        exerciseNames: r.template.exerciseIds.map((id) => nameById[id] ?? id),
        score: r.score,
        excluded: r.excluded,
        inJourney: assignedUsableIds.has(r.template.id),
      };
    };
    const heroRank = ranked.find((r) => selectedIds.has(r.template.id)) ?? null;
    const hero = heroRank ? cardFor(heroRank) : null;
    const others = ranked
      .filter((r) => r.template.id !== heroRank?.template.id)
      .map(cardFor);

    // Alle Skills sind immer aktiv (kein Aktiv-Schalter mehr); jeder Skill
    // erscheint mit Phasen-/Equipment-Hinweis. Fortschritt wird gemergt, wenn
    // vorhanden – sonst Startwerte (Phase 1).
    const progBySkill = new Map(progress.map((p) => [p.skill_id, p]));
    const skillCards: SkillCard[] = skills.map((def) => {
      const p = progBySkill.get(def.id);
      const adv = skillAdvice(
        def,
        p
          ? {
              currentPhase: p.current_phase,
              consecutiveCount: p.counter,
              mastered: p.mastered,
            }
          : undefined,
        ownedKeys,
      );
      const ph = def.phases[adv.phaseIndex];
      const subtitle =
        "Phase " +
        (adv.phaseIndex + 1) +
        " / " +
        def.phases.length +
        (ph ? " · " + ph.label : "") +
        (adv.equipmentMissing ? " · Gerät fehlt" : "");
      return {
        id: def.id,
        name: def.name,
        subtitle,
        gated: adv.equipmentMissing,
      };
    });

    // Letzte Yoga-Einheit.
    const yogaSessions = sessions
      .filter((s) => s.type === "yoga")
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const lastYoga = yogaSessions[0] ?? null;
    const yogaSubtitle = lastYoga
      ? "Zuletzt: " +
        longDateDE(lastYoga.date) +
        (lastYoga.minutes ? " · " + lastYoga.minutes + " min" : "")
      : "Noch keine Einheit";

    return {
      date: longDateDE(today),
      journey: journeyView,
      hero,
      others,
      libraryFallbackHint: selection.libraryFallback,
      skills: skillCards,
      yogaSubtitle,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    isError,
    exercisesQ.data,
    templatesQ.data,
    sessionsQ.data,
    journeyQ.data,
    journeyWorkoutsQ.data,
    skillsQ.data,
    progressQ.data,
    settingsQ.data,
    equipmentQ.data,
    bodyQ.data,
  ]);

  return { isLoading, isError, error, data };
}
