import { useEffect, useMemo, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { ExerciseLiveCard } from "@/components/live/ExerciseLiveCard";
import type { LiveEntry, LiveSet } from "@/lib/liveSession";
import { computeActive } from "@/lib/liveFlow";
import {
  buildTestSets,
  clampTestReps,
  testResult,
  testWeight,
} from "@/lib/rmTest";
import { todayISO, fmtWeight } from "@/lib/format";
import { useBars, usePlates, useDumbbells } from "@/hooks/useInventory";
import { useSettings } from "@/hooks/useSettings";
import { useRmTestActions } from "@/hooks/useRmTestActions";
import type { ExerciseRow } from "@/schemas";
import type { RmFormula } from "@/engine/types";

// 1RM-Test als Live-Block: der Test laeuft in derselben Satz-Eingabe wie das
// Training (ExerciseLiveCard, hier ohne RIR-Spalte und ohne Aufwaermsaetze).
// Vorbelegt sind zwei Saetze mit 5 und 3 Wiederholungen bei rund 90 % des
// aktuellen Rekords; Gewicht und Wiederholungen pegelt der Nutzer frei, weitere
// Saetze kommen ueber „+ Satz“ dazu. Jeder Satz nimmt hoechstens 5
// Wiederholungen (darueber ist eine 1RM-Schaetzung nicht mehr belastbar).
//
// Sobald ein Satz abgehakt ist, zeigt der Block unten die Vorschau
// „altes → neues 1RM“. Der Abschluss setzt den Rekord der Uebung auf den neuen
// Wert - nach oben wie nach unten - und legt die Test-Zeile an.

const RM_FORMULAS: RmFormula[] = ["brzycki", "epley", "wathan", "mean"];
function asRmFormula(v: string | null | undefined): RmFormula {
  return RM_FORMULAS.includes(v as RmFormula) ? (v as RmFormula) : "mean";
}

function toLiveSet(reps: number, weight: number, done: boolean): LiveSet {
  return {
    reps,
    weight,
    score: 3,
    targetReps: reps,
    targetWeight: weight,
    done,
    failed: false,
    adjusted: false,
    adjustNote: "",
  };
}

export function RmTestModal({
  exercise,
  unit,
  open,
  onClose,
}: {
  exercise: ExerciseRow;
  unit: string;
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();
  const settingsQ = useSettings();
  const { add, isPending } = useRmTestActions();

  const formula = asRmFormula(settingsQ.data?.rm_formula);
  const step = settingsQ.data?.weight_step ?? 2.5;

  const bar = useMemo(
    () => (barsQ.data ?? []).find((b) => b.id === exercise.bar_id) ?? null,
    [barsQ.data, exercise.bar_id],
  );
  const plates = useMemo(
    () => (platesQ.data ?? []).map((p) => p.weight),
    [platesQ.data],
  );
  const dumbbells = useMemo(
    () => (dumbbellsQ.data ?? []).map((d) => d.weight),
    [dumbbellsQ.data],
  );

  const start = useMemo(
    () =>
      testWeight(exercise.rm, {
        equipment: exercise.equipment,
        barWeight: bar?.weight ?? null,
        plates,
        dumbbells,
        step,
      }),
    [exercise.rm, exercise.equipment, bar, plates, dumbbells, step],
  );

  const [sets, setSets] = useState<LiveSet[]>([]);

  // Beim Oeffnen frisch vorbelegen (auch nach einem frueheren Test), damit der
  // Block nie mit alten Werten aufgeht.
  useEffect(() => {
    if (!open) return;
    setSets(buildTestSets(start).map((s) => toLiveSet(s.reps, s.weight, false)));
  }, [open, start]);

  const entry: LiveEntry = {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    equipment: exercise.equipment,
    tag:
      exercise.rm != null
        ? "1RM " + fmtWeight(exercise.rm, unit)
        : "noch kein 1RM",
    barId: bar?.id ?? null,
    barName: bar?.name ?? null,
    barWeight: bar?.weight ?? null,
    warmupSets: [],
    sets,
  };

  const active = computeActive([entry]);

  const setValue = (
    si: number,
    kind: "reps" | "weight" | "score",
    value: number,
  ): void => {
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== si) return s;
        if (kind === "reps") {
          const reps = clampTestReps(value);
          return { ...s, reps, targetReps: reps };
        }
        if (kind === "weight") {
          return { ...s, weight: value, targetWeight: value };
        }
        return { ...s, score: value };
      }),
    );
  };

  const toggleSet = (si: number): void => {
    setSets((prev) =>
      prev.map((s, i) => (i === si ? { ...s, done: !s.done } : s)),
    );
  };

  const addSet = (): void => {
    setSets((prev) => {
      const last = prev[prev.length - 1];
      const reps = last ? last.reps : 3;
      const weight = last ? last.weight : start;
      return [...prev, toLiveSet(reps, weight, false)];
    });
  };

  const delSet = (): void => {
    setSets((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const result = testResult(
    sets.map((s) => ({ reps: s.reps, weight: s.weight, done: s.done })),
    formula,
  );

  const canFinish = result.estRm != null && result.best != null && !isPending;

  const finish = async (): Promise<void> => {
    if (result.estRm == null || result.best == null) return;
    await add({
      exerciseId: exercise.id,
      date: todayISO(),
      weight: result.best.weight,
      reps: result.best.reps,
      estRm: result.estRm,
      previousRm: exercise.rm,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} title="1RM-Test">
      <div className="flex flex-col gap-4">
        <p className="text-[14px] leading-snug text-muted-foreground">
          Tast dich mit wenigen, sauberen Wiederholungen heran. Höchstens 5
          Wiederholungen je Satz; Gewicht frei anpassen, weitere Sätze mit
          „+ Satz“.
        </p>

        <ExerciseLiveCard
          entry={entry}
          ei={0}
          active={active}
          plateMode={1}
          plates={plates}
          bars={[]}
          unit={unit}
          onToggleWarm={() => {}}
          onToggleSet={toggleSet}
          onWarmValue={() => {}}
          onSetValue={setValue}
          onAddSet={addSet}
          onDelSet={delSet}
          onChangeBar={() => {}}
          onCyclePlate={() => {}}
          hideScore
        />

        {result.estRm != null && (
          <div className="rounded-[14px] bg-card px-4 py-3 shadow-card">
            <div className="text-[12px] font-semibold tracking-[0.3px] text-muted-foreground uppercase">
              Neues 1RM
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2 font-mono text-[20px] font-semibold text-foreground tabular-nums">
              <span className="text-muted-foreground">
                {exercise.rm != null ? fmtWeight(exercise.rm, unit) : "–"}
              </span>
              <span className="text-muted-foreground">→</span>
              <span>{fmtWeight(result.estRm, unit)}</span>
            </div>
            {result.best && (
              <div className="mt-1 font-mono text-[13px] text-muted-foreground tabular-nums">
                bester Satz {fmtWeight(result.best.weight, unit)} ×{" "}
                {result.best.reps}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!canFinish}
          onClick={() => void finish()}
          className="flex w-full items-center justify-center rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
        >
          {isPending ? "Wird gespeichert …" : "Test abschließen"}
        </button>
        {!canFinish && !isPending && (
          <p className="-mt-2 text-center text-[13px] text-muted-foreground">
            Hak mindestens einen Satz ab, um den Test abzuschließen.
          </p>
        )}
      </div>
    </Overlay>
  );
}
