import { useEffect, useState } from "react";
import { Lock, Check } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Stepper } from "@/components/ui/stepper";
import { useUpdateExercise } from "@/hooks/useUpdateExercise";
import { useActivePhaseTarget } from "@/hooks/useActivePhaseTarget";
import { useSettings } from "@/hooks/useSettings";
import { lockedTarget } from "@/lib/exerciseTarget";
import { misstGewicht } from "@/lib/exercises";
import { fmtScore } from "@/lib/format";
import type { ExerciseRow } from "@/schemas";

// "Uebung anpassen"-Popup: ueber das generische Overlay. Es zeigt die Stammwerte
// der Uebung – Arbeitsgewicht (nur Gewichtsuebungen) und Repband – und keine
// Coach-Stellschraube mehr. Der Ziel-Score ist seit Issue #298 systemweit fest
// (Score 3 / RIR 2), wo kein Wochenplan gilt; mit ihm faellt auch der Warnkasten
// weg, der vor einem Eingriff in den Kern warnte.
//
// Gibt die laufende Journey-Phase etwas vor, steht statt des Repbands die
// gesperrte Zeile mit Schloss – und zwar mit dem, was wirklich gilt (Issue
// #297): die Wochenzeile des Plans ("4 × 4 · RIR 1"), wenn er die Uebung
// regiert, sonst das Band der Phase ("4–6 Wdh · RIR 2"). Die Entscheidung faellt
// in lib/exerciseTarget ueber dieselbe Weiche wie beim Coach.

const FEEDBACK_MS = 850;

interface Draft {
  workWeight: number;
  repmin: number;
  repmax: number;
}

// Kleiner Eyebrow-Titel ueber einem Abschnitt.
function FieldLabel({ children }: { children: string }): React.ReactElement {
  return (
    <div className="mb-2 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
      {children}
    </div>
  );
}

// Hilfetext unter einem Abschnitt.
function FieldHint({ children }: { children: string }): React.ReactElement {
  return (
    <p className="mx-0.5 mt-2 mb-[18px] text-[12px] leading-[1.5] text-muted-foreground">
      {children}
    </p>
  );
}

export function ExerciseEditModal({
  exercise,
  open,
  onClose,
}: {
  exercise: ExerciseRow;
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const { update, isPending } = useUpdateExercise();
  const settingsQ = useSettings();
  const phaseTarget = useActivePhaseTarget();

  const step = settingsQ.data?.weight_step || 2.5;
  // Arbeitsgewicht nur bei Uebungen, die sich ueberhaupt in Gewicht messen.
  // Frueher hing das am Profil und bot Plank (Core auf Haltezeit) einen
  // Gewichts-Stepper an – siehe misstGewicht.
  const isWeight = misstGewicht(exercise.metric);
  // Die Vorgabe der Journey; null heisst: es gibt keine, das Repband bleibt
  // bedienbar.
  const locked = lockedTarget(exercise, {
    planWeek: phaseTarget.planWeek,
    repBand: phaseTarget.repBand,
  });
  const repLocked = locked !== null;
  const repUnit = exercise.metric === "duration" ? "Sekunden" : "Wdh";

  const [draft, setDraft] = useState<Draft>({
    workWeight: exercise.work_weight,
    repmin: exercise.rep_range_min ?? 0,
    repmax: exercise.rep_range_max ?? 0,
  });
  const [saved, setSaved] = useState(false);

  // Beim Oeffnen den Entwurf frisch aus der Uebung setzen.
  useEffect(() => {
    if (open) {
      setDraft({
        workWeight: exercise.work_weight,
        repmin: exercise.rep_range_min ?? 0,
        repmax: exercise.rep_range_max ?? 0,
      });
      setSaved(false);
    }
  }, [open, exercise]);

  // Stepper-Anpassung mit denselben Grenzen wie V1.
  const adjWeight = (delta: number): void =>
    setDraft((d) => ({
      ...d,
      workWeight: Math.max(0, Math.round((d.workWeight + delta * step) * 100) / 100),
    }));
  const adjRepMin = (delta: number): void =>
    setDraft((d) => {
      const repmin = Math.max(1, d.repmin + delta);
      return { ...d, repmin, repmax: repmin > d.repmax ? repmin : d.repmax };
    });
  const adjRepMax = (delta: number): void =>
    setDraft((d) => {
      const repmax = Math.max(1, d.repmax + delta);
      return { ...d, repmax, repmin: repmax < d.repmin ? repmax : d.repmin };
    });

  const save = async (): Promise<void> => {
    await update(exercise.id, {
      work_weight: draft.workWeight,
      ...(repLocked
        ? {}
        : { rep_range_min: draft.repmin, rep_range_max: draft.repmax }),
    });
    setSaved(true);
    window.setTimeout(onClose, FEEDBACK_MS);
  };

  // Regiert der Wochenplan die Uebung, haengt die Last am Anker vom Phasenstart:
  // eine Korrektur hier wirkt fuer den Coach erst beim naechsten Phaseneintritt.
  // Bedienbar bleibt der Regler trotzdem – sonst liesse sich eine falsche Basis
  // bis zum Phasenende nicht geradeziehen.
  const weightHint = locked?.planGoverned
    ? "Diese Phase rechnet mit dem Anker vom Phasenstart – eine Korrektur hier " +
      "greift für den Coach erst beim nächsten Phaseneintritt. Steht die Basis " +
      "falsch, lohnt sie sich trotzdem."
    : "Läuft normalerweise von allein mit – nach jedem Training wird es auf " +
      "dein höchstes gefahrenes Arbeitsgewicht gesetzt. Hier nur ändern, wenn " +
      "du die Basis sofort korrigieren willst.";

  return (
    <Overlay open={open} onClose={onClose} title="Übung anpassen">
      <div className="-mt-4 mb-[18px] text-[13px] text-muted-foreground">
        {exercise.name}
      </div>

      {isWeight && (
        <>
          <FieldLabel>Arbeitsgewicht</FieldLabel>
          <Stepper
            onDecrement={() => adjWeight(-1)}
            onIncrement={() => adjWeight(1)}
            disabled={saved}
            className="rounded-[14px] bg-card px-3.5 py-2.5 shadow-card"
          >
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-[26px] font-bold tabular-nums text-foreground min-[960px]:text-[28px]">
                {fmtScore(draft.workWeight)}
              </span>
              <span className="text-[14px] font-medium text-muted-foreground">
                kg
              </span>
            </span>
          </Stepper>
          <FieldHint>{weightHint}</FieldHint>
        </>
      )}

      <FieldLabel>{locked ? locked.label : "Repband"}</FieldLabel>
      {locked ? (
        <>
          <div className="flex items-center justify-between rounded-[14px] bg-muted px-4 py-3">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
              <Lock className="size-[14px]" />
              {locked.source}
            </span>
            <span className="font-mono text-[16px] font-bold tabular-nums text-skill">
              {locked.value}
            </span>
          </div>
          <FieldHint>
            {locked.planGoverned
              ? "Sätze, Wiederholungen und Ziel-Anstrengung kommen aus der laufenden Woche deiner Journey-Phase und lassen sich hier nicht ändern."
              : "Kommt aus der aktiven Journey-Phase und lässt sich hier nicht ändern."}
          </FieldHint>
        </>
      ) : (
        <>
          <div className="flex gap-3">
            <Stepper
              size="sm"
              decLabel="Weniger Mindest-Wdh"
              incLabel="Mehr Mindest-Wdh"
              onDecrement={() => adjRepMin(-1)}
              onIncrement={() => adjRepMin(1)}
              disabled={saved}
              className="flex-1 rounded-[14px] bg-card px-2.5 py-2 shadow-card"
            >
              <span className="font-mono text-[20px] font-bold tabular-nums text-foreground">
                {draft.repmin}
              </span>
            </Stepper>
            <Stepper
              size="sm"
              decLabel="Weniger Höchst-Wdh"
              incLabel="Mehr Höchst-Wdh"
              onDecrement={() => adjRepMax(-1)}
              onIncrement={() => adjRepMax(1)}
              disabled={saved}
              className="flex-1 rounded-[14px] bg-card px-2.5 py-2 shadow-card"
            >
              <span className="font-mono text-[20px] font-bold tabular-nums text-foreground">
                {draft.repmax}
              </span>
            </Stepper>
          </div>
          <FieldHint>
            {"Dein Ziel-Korridor in " +
              repUnit +
              ". Triffst du das obere Ende in allen Sätzen sauber, schlägt der Coach mehr vor."}
          </FieldHint>
        </>
      )}

      {saved ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground">
          <Check className="size-[17px]" strokeWidth={2.6} />
          Übernommen
        </div>
      ) : (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-none rounded-[13px] border border-border bg-card px-5 py-3.5 text-[15px] font-semibold text-foreground transition-[filter] hover:brightness-95"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isPending}
            className="flex-1 rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105 disabled:opacity-50"
          >
            Übernehmen
          </button>
        </div>
      )}
    </Overlay>
  );
}
