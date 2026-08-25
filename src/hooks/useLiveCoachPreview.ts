import { useMemo } from "react";
import { coachViewFor, type CoachStandExercise } from "@/lib/coachStand";
import { buildLastEntries } from "@/lib/lastEntries";
import { derivePhaseContext } from "@/lib/phaseContext";
import { buildPlanSource } from "@/lib/planContext";
import {
  isBlockComplete,
  liveEntryToSetEntry,
  liveWorkWeight,
  type LiveCoachPreview,
} from "@/lib/livePreview";
import { todayISO } from "@/lib/format";
import { useLiveSession } from "./useLiveSession";
import { useExercises } from "./useExercises";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates, useDumbbells } from "./useInventory";

// Coach-Vorschau waehrend der laufenden Kraft-Einheit (#190): was der Coach aus
// dem bisher Geleisteten eines Uebungsblocks machen wuerde - steigern, halten,
// senken. Dieselbe Kette wie auf der Uebungsseite (useCoachStatuses), nur mit
// der laufenden Einheit als Vordaten statt der zuletzt gespeicherten.
//
// Gerechnet wird ab dem ersten abgehakten Satz und danach nach jedem weiteren
// neu (#193); solange offene Saetze im Block stehen, ist der Stand vorlaeufig.
// Die Lesart ist durchgehend "was kaeme heraus, wenn ich jetzt beende" - offene
// Saetze verfallen beim Beenden ohnehin.
//
// Keine eigene Rechnung: dieselbe Coach-Kette (coachViewFor in lib/coachStand)
// wie Live-Aufbau und Uebungsseite, dieselben gecachten Daten-Hooks wie der
// Live-Aufbau, kein zusaetzlicher Netz-Zugriff, kein Schreibvorgang. Was diese
// Lage unterscheidet, steht als `running` in der Eingabe: gerechnet wird auf dem
// heute Abgehakten, und der Phasenwechsel-Einstieg ruht - ob nach dieser Einheit
// ein Phasenwechsel ansteht, ist waehrend des Trainings noch nicht entschieden,
// das Override wuerde ein Gewicht anzeigen, das so nicht zwingend eintritt.
//
// In einer Phase mit Wochenplan zerfaellt die Vorschau in zwei Aussagen
// (#268, Schritt 2): die Vorgabe DIESER Woche steht fest und wird wie beim
// Aufbau der Einheit aus dem gespeicherten Stand gerechnet; was daraus fuer die
// NAECHSTE Woche wird, ist der Ausblick und haengt am Verlauf der Einheit.
// Vorher lief beides durch eine Rechnung, die die laufende Einheit als Vorwoche
// wertete - angezeigt wurde damit das Gewicht der naechsten Woche neben den
// Wiederholungen der laufenden, ein Paar, das real nie vorkommt.
//
// Genau diese Trennung entscheidet auch, wann es ueberhaupt etwas zu zeigen gibt
// (#268, Schritt 3): die Wochenvorgabe braucht keinen abgehakten Satz und steht
// darum von Beginn der Einheit an, der Ausblick kommt erst dazu, wenn der erste
// Satz steht. Ausserhalb des Wochenplans bleibt es beim ersten abgehakten Satz.

interface CoachBar {
  id: string;
  name: string;
  weight: number;
}

export interface UseLiveCoachPreview {
  /** Coach-Vorschau je Uebungsblock, adressiert ueber den Entry-Index (ei).
   *  Nach Index und nicht nach Uebungs-ID, weil dieselbe Uebung theoretisch
   *  zweimal in einer Einheit stehen kann. Nicht progressiv gerechnete Uebungen
   *  ("carry") fehlen im Ergebnis, ebenso Bloecke ohne abgehakten Satz -
   *  ausser bei Hauptuebungen im Wochenplan: deren Wochenvorgabe steht von
   *  Beginn der Einheit an. */
  byEntry: Record<number, LiveCoachPreview>;
}

export function useLiveCoachPreview(): UseLiveCoachPreview {
  const { session } = useLiveSession();
  const exercisesQ = useExercises();
  const sessionsQ = useSessions();
  const detailedQ = useSessionsDetailed();
  const journeyQ = useActiveJourney();
  const settingsQ = useSettings();
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();

  const workout = session?.kind === "workout" ? session : null;

  const ready =
    workout != null &&
    exercisesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null &&
    dumbbellsQ.data != null;

  const byEntry = useMemo<Record<number, LiveCoachPreview>>(() => {
    const out: Record<number, LiveCoachPreview> = {};
    if (!ready || !workout) return out;

    const bars: CoachBar[] = (barsQ.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
    }));
    const plates = (platesQ.data ?? []).map((p) => p.weight);
    const dumbbells = (dumbbellsQ.data ?? []).map((d) => d.weight);
    // Der bisher letzte gespeicherte Eintrag rueckt in die Rolle der Einheit
    // DAVOR - die laufende Einheit ist ab jetzt die letzte.
    const prevEntryByExercise = buildLastEntries(detailedQ.data ?? []);
    const weightStep = settingsQ.data?.weight_step ?? null;
    const unit = settingsQ.data?.unit ?? "kg";
    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

    const ph = derivePhaseContext(
      journeyQ.data ?? null,
      sessionsQ.data ?? [],
      freqTarget,
      todayISO(),
    );
    // Wochenplan-Stand der laufenden Phase - dieselbe Quelle wie der Live-Aufbau.
    const planSource = buildPlanSource(
      ph,
      sessionsQ.data ?? [],
      detailedQ.data ?? [],
      journeyQ.data?.phases ?? [],
      freqTarget,
    );
    const hasPhase = ph.volumePhase != null;
    const freeMode = ph.journeyId === null;
    const exMap = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));

    workout.entries.forEach((entry, ei) => {
      const e = exMap.get(entry.exerciseId);
      if (!e) return;
      // Was diese Einheit bisher hergibt: die abgehakten Arbeitssaetze und das
      // darin hoechste Gewicht. Kein Tor auf den vollstaendigen Block - ein
      // abgehakter Satz genuegt, und im Wochenplan geht es auch ohne.
      const judged = liveEntryToSetEntry(entry);
      const workedWeight = liveWorkWeight(entry);

      // Der Katalogstand der Uebung; womit die Vorschau tatsaechlich rechnet,
      // entscheidet die Kette anhand von `running`.
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
      const view = coachViewFor({
        exo,
        // Wochenplan-Bezug wie beim Aufbau der Einheit: aus dem gespeicherten
        // Stand, nicht aus den Saetzen, die gerade laufen.
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
        // Vordaten: was heute schon abgehakt ist, davor der zuletzt
        // gespeicherte Eintrag der Uebung. Ohne beides bleibt es beim
        // Startzustand - dieselbe Lesart wie auf der Uebungsseite
        // (useCoachStatuses), damit dort und hier dasselbe Zeichen steht.
        lastEntry: judged,
        prevEntry: prevEntryByExercise[e.id] ?? null,
        running: { workedWeight },
        unit,
      });
      // null heisst: die Doppelprogression hat ohne abgehakten Satz nichts zu
      // bewerten. Begleit-/Koerpergewichtsuebungen und freies Training rechnen
      // gar nicht progressiv ("carry"). Beides ohne Coach-Zeichen.
      if (!view || view.status.decision === "carry") return;
      out[ei] = { ...view, provisional: !isBlockComplete(entry) };
    });
    return out;
  }, [
    ready,
    workout,
    exercisesQ.data,
    sessionsQ.data,
    detailedQ.data,
    journeyQ.data,
    settingsQ.data,
    barsQ.data,
    platesQ.data,
    dumbbellsQ.data,
  ]);

  return { byEntry };
}
