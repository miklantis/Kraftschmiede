import { useState } from "react";
import { Trash2, Target } from "lucide-react";
import { Section } from "@/components/ui/section";
import { RmTestModal } from "./RmTestModal";
import { useRmTests } from "@/hooks/useRmTests";
import { useRmTestActions } from "@/hooks/useRmTestActions";
import { longDateShort, fmtWeight } from "@/lib/format";
import type { ExerciseRow, RmTestRow } from "@/schemas";

// Abschnitt "1RM" auf der Uebungs-Detailseite. Das 1RM ist ein
// beweisgebundener Rekord und bekommt hier einen eigenen Block, getrennt vom
// Coach-Status (Arbeitsgewicht) und der Statistik-Reihe: aktueller Wert mit
// Datum, der Test-Knopf und die Liste der bisherigen Tests.
//
// Nur hier ist ein Test loeschbar (Fehleingabe). Das 1RM wird dabei bewusst
// NICHT auf einen frueheren Wert zurueckgerechnet – Korrektur laeuft ueber
// einen neuen Test.
//
// Der Block erscheint nur bei Gewichtsuebungen; die Entscheidung darueber
// trifft die Seite (kein 1RM bei reinem Koerpergewicht).
export function RmSection({
  exercise,
  unit,
}: {
  exercise: ExerciseRow;
  unit: string;
}): React.ReactElement {
  const exerciseId = exercise.id;
  const currentRm = exercise.rm;
  const rmAsOf = exercise.rm_as_of;
  const testsQ = useRmTests(exerciseId);
  const { remove, isPending } = useRmTestActions();
  const [testOpen, setTestOpen] = useState(false);

  const rows = testsQ.data ?? [];

  const onDelete = (t: RmTestRow): void => {
    const label = longDateShort(t.date);
    if (window.confirm("Test vom " + label + " löschen?")) {
      void remove(t.id);
    }
  };

  // Richtung eines Tests gegenueber dem Rekord davor (null = erster Wert).
  const direction = (t: RmTestRow): string => {
    if (t.previous_rm == null) return "";
    if (t.est_rm > t.previous_rm) return "↑";
    if (t.est_rm < t.previous_rm) return "↓";
    return "=";
  };

  return (
    <Section eyebrow="1RM">
      <div className="rounded-[18px] bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[22px] font-semibold text-foreground tabular-nums">
            {currentRm != null ? fmtWeight(currentRm, unit) : "–"}
          </span>
          <span className="text-[14px] text-muted-foreground">
            {currentRm == null
              ? "noch kein Wert"
              : rmAsOf
                ? "Stand " + longDateShort(rmAsOf)
                : ""}
          </span>
        </div>
        <p className="mt-2.5 text-[14px] leading-snug text-muted-foreground">
          Rekord aus wenigen Wiederholungen. Das Training hebt ihn nur an; mit
          einem Test misst du deinen Stand bewusst neu.
        </p>

        <button
          type="button"
          onClick={() => setTestOpen(true)}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:shadow-none"
        >
          <Target className="size-4" />
          1RM testen
        </button>
      </div>

      {testsQ.isLoading ? (
        <p className="mt-3 text-[15px] text-muted-foreground">Wird geladen …</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted-foreground">
          Noch kein Test gemacht.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-[14px] bg-card px-4 py-3 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-foreground">
                  {longDateShort(t.date)}
                </div>
                <div className="font-mono text-[14px] text-muted-foreground tabular-nums">
                  {fmtWeight(t.weight, unit)} × {t.reps}
                </div>
              </div>
              <span className="font-mono text-[15px] font-semibold text-foreground tabular-nums">
                {direction(t)} {fmtWeight(t.est_rm, unit)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(t)}
                disabled={isPending}
                aria-label="Test löschen"
                className="-m-1.5 flex-none rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <RmTestModal
        exercise={exercise}
        unit={unit}
        open={testOpen}
        onClose={() => setTestOpen(false)}
      />
    </Section>
  );
}
