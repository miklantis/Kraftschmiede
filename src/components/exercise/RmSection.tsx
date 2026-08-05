import { useState } from "react";
import { Trash2, Target } from "lucide-react";
import { Section } from "@/components/ui/section";
import { useStartRmTest } from "@/hooks/useStartRmTest";
import { useRmTests } from "@/hooks/useRmTests";
import { useRmTestActions } from "@/hooks/useRmTestActions";
import { longDateShort, fmtWeight } from "@/lib/format";
import { rollbackForDelete } from "@/lib/rmTest";
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
  const { start, blocked } = useStartRmTest();
  // Welche Zeile fragt gerade nach (Inline-Rueckfrage wie im Verlauf).
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = testsQ.data ?? [];

  // Beim juengsten Test nimmt das Loeschen den Rekord mit zurueck - das steht
  // in der Rueckfrage, damit klar ist, was passiert.
  const rollbackNote = (t: RmTestRow): string => {
    const restore = rollbackForDelete(rows, t.id);
    if (restore == null) return "Test wird gelöscht – dein 1RM bleibt.";
    return restore.rm != null
      ? "Test wird gelöscht, 1RM geht zurück auf " +
          fmtWeight(restore.rm, unit) +
          " – sicher?"
      : "Test wird gelöscht, die Übung hat danach wieder kein 1RM – sicher?";
  };

  const onDelete = async (t: RmTestRow): Promise<void> => {
    const restore = rollbackForDelete(rows, t.id);
    await remove({ id: t.id, exerciseId, restore });
    setConfirmId(null);
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
        {blocked && (
          <p className="mt-2 text-[13px] text-muted-foreground">
            Es läuft bereits eine Einheit – beende sie zuerst.
          </p>
        )}

        <button
          type="button"
          onClick={() => start(exercise)}
          disabled={blocked}
          title={
            blocked ? "Es läuft bereits eine Einheit." : undefined
          }
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
              className="rounded-[14px] bg-card px-4 py-3 shadow-card"
            >
              <div className="flex items-center gap-3">
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
                {confirmId !== t.id && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(t.id)}
                    disabled={isPending}
                    aria-label="Test löschen"
                    className="-m-1.5 flex-none rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              {confirmId === t.id && (
                <div className="flex flex-col gap-2.5 pt-3">
                  <span className="text-[13px] text-muted-foreground">
                    {rollbackNote(t)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-control bg-secondary px-3.5 py-2 text-[13px] font-semibold text-foreground"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void onDelete(t)}
                      className="rounded-control bg-danger px-3.5 py-2 text-[13px] font-semibold text-danger-foreground disabled:opacity-50"
                    >
                      {isPending ? "Löschen …" : "Löschen"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
