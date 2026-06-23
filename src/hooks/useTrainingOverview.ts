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
import { longDateDE, todayISO } from "@/lib/format";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useSessions } from "./useSessions";
import { useActiveJourney } from "./useJourney";
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
        kind: e.kind,
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

    // Coach-Ranking der Workouts.
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
    const ranked = rankWorkouts(
      templates.map((t) => ({ id: t.id, exerciseIds: t.exerciseIds })),
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
      };
    };
    const hero = ranked.length ? cardFor(ranked[0]) : null;
    const others = ranked.slice(1).map(cardFor);

    // Aktive Skills mit Phasen-/Equipment-Hinweis.
    const skillCards: SkillCard[] = progress
      .filter((p) => p.active)
      .map((p) => {
        const def = skills.find((s) => s.id === p.skill_id);
        if (!def) return null;
        const adv = skillAdvice(
          def,
          {
            currentPhase: p.current_phase,
            consecutiveCount: p.counter,
            mastered: p.mastered,
          },
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
      })
      .filter((c): c is SkillCard => c !== null);

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
    skillsQ.data,
    progressQ.data,
    settingsQ.data,
    equipmentQ.data,
    bodyQ.data,
  ]);

  return { isLoading, isError, error, data };
}
