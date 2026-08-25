import { useMemo } from "react";
import type { CoachView } from "@/lib/coach";
import { coachViewFor, type CoachStandExercise } from "@/lib/coachStand";
import { buildPlanSource } from "@/lib/planContext";
import { buildLastEntries, buildPrevEntries } from "@/lib/lastEntries";
import { derivePhaseContext } from "@/lib/phaseContext";
import { todayISO } from "@/lib/format";
import { useExercises } from "./useExercises";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates, useDumbbells } from "./useInventory";

// Coach-Status je Uebung fuer die Uebungsseite (Liste + Detail): was der Coach
// fuer die naechste Einheit dieser Uebung entscheiden wuerde - steigern, halten,
// senken (bzw. Begleituebung "frei" / ohne Vordaten "Start"). Buendelt dieselben
// Daten-Hooks wie der Live-Aufbau (gecacht, kein zusaetzlicher Netz-Zugriff),
// formt sie ueber die geteilten Bausteine (lastEntries, phaseContext) und ruft die
// gemeinsame Coach-Kette coachViewFor (lib/coachStand) - dieselbe Fassung, die
// auch den Aufbau einer Einheit und die Vorschau im Training traegt. Der Status
// ist damit deckungsgleich mit dem Vorschlag, den eine gestartete Einheit zeigen
// wuerde. Reine Anzeige, kein Schreibvorgang.
//
// Geliefert wird dieselbe Anzeigeform wie im Training (CoachView, #268,
// Schritt 4): Zahlen, Geltungsbereich und Ausblick. Vorher trug die
// Uebungsseite nur die Zahlen - eine Uebung ausserhalb des Trainings
// nachgeschlagen sagte damit weniger als dieselbe Uebung auf der Hantel.
// Bewertet wird hier die letzte gespeicherte Einheit der laufenden
// Journey-Woche; im Training ist es die laufende. Steht diese Woche noch
// nichts, gibt es nichts zu bewerten und damit keinen Ausblick - dieselbe Regel
// wie auf der Karte vor dem ersten abgehakten Satz.

interface CoachBar {
  id: string;
  name: string;
  weight: number;
}

export interface UseCoachStatuses {
  isLoading: boolean;
  ready: boolean;
  byExercise: Record<string, CoachView>;
}

export function useCoachStatuses(): UseCoachStatuses {
  const exercisesQ = useExercises();
  const sessionsQ = useSessions();
  const detailedQ = useSessionsDetailed();
  const journeyQ = useActiveJourney();
  const settingsQ = useSettings();
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();

  const ready =
    exercisesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null &&
    dumbbellsQ.data != null;

  const isLoading =
    exercisesQ.isLoading ||
    sessionsQ.isLoading ||
    detailedQ.isLoading ||
    barsQ.isLoading ||
    platesQ.isLoading ||
    dumbbellsQ.isLoading;

  const byExercise = useMemo<Record<string, CoachView>>(() => {
    const out: Record<string, CoachView> = {};
    if (!ready) return out;

    const bars: CoachBar[] = (barsQ.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
    }));
    const plates = (platesQ.data ?? []).map((p) => p.weight);
    const dumbbells = (dumbbellsQ.data ?? []).map((d) => d.weight);
    const lastEntryByExercise = buildLastEntries(detailedQ.data ?? []);
    // Die Einheit davor je Uebung – Grundlage der Rueckwaertsregel des Coaches.
    const prevEntryByExercise = buildPrevEntries(detailedQ.data ?? []);
    const weightStep = settingsQ.data?.weight_step ?? null;
    const unit = settingsQ.data?.unit ?? "kg";
    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

    const ph = derivePhaseContext(
      journeyQ.data ?? null,
      sessionsQ.data ?? [],
      freqTarget,
      todayISO(),
    );
    const hasPhase = ph.volumePhase != null;
    // Ohne aktive Journey trainiert der Nutzer frei: der Coach gibt nichts vor,
    // die Statusanzeige zeigt entsprechend "frei anpassbar".
    const freeMode = ph.journeyId === null;

    // Wochenplan-Stand der laufenden Phase - dieselbe Quelle wie der Live-Aufbau.
    const planSource = buildPlanSource(
      ph,
      sessionsQ.data ?? [],
      detailedQ.data ?? [],
      journeyQ.data?.phases ?? [],
      freqTarget,
    );

    for (const e of exercisesQ.data ?? []) {
      const exo: CoachStandExercise = {
        id: e.id,
        key: e.key,
        profile: e.profile,
        tier: e.tier,
        equipment: e.equipment,
        repRange:
          e.rep_range_min != null && e.rep_range_max != null
            ? [e.rep_range_min, e.rep_range_max]
            : null,
        workWeight: e.work_weight,
        barId: e.bar_id,
        rm: e.rm,
        referenceWeight: e.reference_weight,
        referencePhaseId: e.reference_phase_id,
        planStartWeight: e.plan_start_weight,
      };
      // Vordaten sind hier die zuletzt gespeicherte Einheit der Uebung - keine
      // laufende Einheit im Spiel, also greift auch der Phasenwechsel-Einstieg
      // wie beim Aufbau einer Einheit.
      const view = coachViewFor({
        exo,
        planSource,
        phaseFocus: ph.phaseFocus,
        phaseRepTarget: ph.phaseRepTarget,
        hasPhase,
        freeMode,
        loadFactor: ph.loadFactor,
        weightStep,
        bars,
        plates,
        dumbbells,
        lastEntry: lastEntryByExercise[e.id] ?? null,
        prevEntry: prevEntryByExercise[e.id] ?? null,
        unit,
      });
      // Ohne laufende Einheit rechnet die Kette immer (s. coachStandFor).
      if (!view) continue;
      out[e.id] = view;
    }
    return out;
  }, [
    ready,
    exercisesQ.data,
    sessionsQ.data,
    detailedQ.data,
    journeyQ.data,
    settingsQ.data,
    barsQ.data,
    platesQ.data,
    dumbbellsQ.data,
  ]);

  return { isLoading, ready, byExercise };
}
