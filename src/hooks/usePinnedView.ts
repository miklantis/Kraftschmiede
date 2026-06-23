import { usePinnedCharts } from "./usePinnedCharts";
import { useExercises } from "./useExercises";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useSettings } from "./useSettings";
import {
  buildExerciseHistory,
  EX_METRIC_SHORT,
  type ExHistoryEntry,
  type ExMetric,
} from "@/lib/exerciseHistory";

export interface PinnedCard {
  key: string; // exerciseId + ":" + metric
  exerciseId: string;
  metric: ExMetric;
  title: string; // "Übungsname · Metrik"
  history: ExHistoryEntry[];
}

export interface PinnedView {
  isLoading: boolean;
  unit: string;
  cards: PinnedCard[];
}

// Ansichtsmodell der "Angeheftet"-Sektion oben auf /uebungen. Loest jeden Pin
// (Uebung + Metrik) gegen den Katalog auf, baut den Verlauf wie auf der
// Detailseite (buildExerciseHistory + rm-Formel) und liefert fertige Kacheln in
// Anheft-Reihenfolge. Pins ohne passende Katalog-Uebung fallen weg.
export function usePinnedView(): PinnedView {
  const { pins } = usePinnedCharts();
  const exercisesQ = useExercises();
  const sessionsQ = useSessionsDetailed();
  const settingsQ = useSettings();

  const isLoading =
    exercisesQ.isLoading || sessionsQ.isLoading || settingsQ.isLoading;
  const unit = settingsQ.data?.unit ?? "kg";
  const rmFormula = settingsQ.data?.rm_formula ?? "mean";

  const cards: PinnedCard[] = [];
  if (exercisesQ.data && sessionsQ.data) {
    for (const pin of pins) {
      const ex = exercisesQ.data.find((e) => e.id === pin.exerciseId);
      if (!ex) continue;
      cards.push({
        key: pin.exerciseId + ":" + pin.metric,
        exerciseId: pin.exerciseId,
        metric: pin.metric,
        title: ex.name + " · " + EX_METRIC_SHORT[pin.metric],
        history: buildExerciseHistory(ex.id, sessionsQ.data, rmFormula),
      });
    }
  }

  return { isLoading, unit, cards };
}
