import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Prose } from "@/components/ui/prose";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { CoachStatusPill } from "@/components/ui/coach-status-pill";
import { MuscleMap } from "@/components/ui/muscle-map";
import { PageReveal } from "@/components/ui/page-reveal";
import { ExerciseChartCard } from "@/components/exercise/ExerciseChartCard";
import { ExerciseEditModal } from "@/components/exercise/ExerciseEditModal";
import { useExerciseDetail } from "@/hooks/useExerciseDetail";
import { profileLabel, equipmentLabel, tierLabel } from "@/lib/labels";
import { longDateShort, fmtWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

// Uebungs-Detail. Eigenstaendige Vollseite (entschachtelt mit _), ersetzt die
// Liste wie in V1. Zeigt Kopf, Statistik-Reihe, Verlaufsdiagramm, die Muscle-Map
// (beanspruchte Muskeln), den Trainingsverlauf und "Uebung anpassen" (Popup).
// Der Anheften-Umschalter sitzt im Kopf der Chartkarte.
export const Route = createFileRoute("/uebungen_/$exerciseId")({
  component: ExerciseDetailPage,
});

function ExerciseDetailPage(): React.ReactElement {
  const { exerciseId } = Route.useParams();
  const [editOpen, setEditOpen] = useState(false);
  const {
    isLoading,
    isError,
    error,
    exercise,
    stats,
    verlauf,
    chartHistory,
    metricOptions,
    defaultMetric,
    unit,
    muscleValues,
    coach,
  } = useExerciseDetail(exerciseId);

  if (isLoading) {
    return (
      <div>
        <BackLink to="/uebungen" label="Übungen" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <BackLink to="/uebungen" label="Übungen" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div>
        <BackLink to="/uebungen" label="Übungen" />
        <p className="text-sm text-muted-foreground">
          Diese Übung wurde nicht gefunden.
        </p>
      </div>
    );
  }

  return (
    <>
      <BackLink to="/uebungen" label="Übungen" />
      <PageHeader title={exercise.name} className="mb-3 min-[960px]:mb-4" />
      <div className="-mt-2 mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-[20px] bg-foreground px-2.5 py-1 text-[13px] font-medium text-background">
          {profileLabel(exercise.profile)}
        </span>
        <span className="rounded-[20px] bg-foreground px-2.5 py-1 text-[13px] font-medium text-background">
          {equipmentLabel(exercise.equipment)}
        </span>
        <span className="rounded-[20px] bg-foreground px-2.5 py-1 text-[13px] font-medium text-background">
          {tierLabel(exercise.tier)}
        </span>
      </div>
      {exercise.description && <Prose>{exercise.description}</Prose>}

      {(coach || stats.length > 0) && (
        <Section eyebrow="Coach" className="mb-5 min-[960px]:mb-6">
          <div className="rounded-[18px] bg-card p-4 shadow-card min-[960px]:p-5">
            {coach && (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <CoachStatusPill state={coach.state} />
                  {coach.state !== "carry" && (
                    <span className="font-mono text-[15px] font-semibold text-foreground tabular-nums">
                      {fmtWeight(coach.weight, unit)} × {coach.targetReps}
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[14px] leading-snug text-muted-foreground">
                  {coach.note}
                </p>
              </>
            )}
            {stats.length > 0 && (
              <div
                className={cn(
                  "flex flex-wrap items-baseline gap-x-[22px] gap-y-2 text-[15px] text-muted-foreground",
                  coach && "mt-3.5 border-t border-border pt-3.5",
                )}
              >
                {stats.map((c, i) => (
                  <span key={i}>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        c.accent ? "text-primary" : "text-foreground",
                      )}
                    >
                      {c.value}
                    </span>{" "}
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      <PageReveal>
        {/* Mobil ein Stapel in fester Reihenfolge (Statistik, Diagramm, Muskeln,
          Verlauf). Ab 960px zwei unabhaengig fliessende Spalten wie V1: links
          (breiter) Diagramm + Verlauf, rechts Statistik + Muskeln. Bewusst KEIN
          gemeinsames Zeilenraster - jede Spalte stapelt ihre Bloecke fuer sich,
          sodass die Muskeln direkt unter der Statistik folgen (keine Luecke).
          Mobil flachen die Spalten ueber display:contents auf, damit die
          order-Reihenfolge im aeusseren Flex greift. data-reveal-columns sorgt
          dafuer, dass der Reveal-Effekt dieser sichtbaren Reihenfolge folgt. */}
        <div
          data-reveal-columns
          className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-start min-[960px]:gap-x-[26px]"
        >
        {/* Linke Spalte: Diagramm + Verlauf */}
        <div className="contents min-w-0 min-[960px]:flex min-[960px]:flex-[1.6] min-[960px]:flex-col min-[960px]:gap-7">
          {metricOptions.length > 0 && (
            <div className="order-2 min-w-0 min-[960px]:order-none">
              <ExerciseChartCard
                exerciseId={exercise.id}
                history={chartHistory}
                options={metricOptions}
                defaultMetric={defaultMetric}
                unit={unit}
              />
            </div>
          )}

          <Section
            eyebrow="Verlauf"
            className="order-4 min-w-0 min-[960px]:order-none"
          >
            {verlauf.length === 0 ? (
              <p className="text-[15px] text-muted-foreground">
                Noch keine absolvierte Session mit dieser Übung.
              </p>
            ) : (
              <List bordered>
                {verlauf.map((r, i) => (
                  <ListRow
                    key={i}
                    title={longDateShort(r.date)}
                    subtitle={r.line || undefined}
                    trailing={
                      r.right ? (
                        <span className="font-mono text-[14px] text-muted-foreground tabular-nums">
                          {r.right}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </List>
            )}
          </Section>
        </div>

        {/* Rechte Spalte: Muskeln + Uebung anpassen (Statistik wanderte in den
            Coach-Block oben). */}
        <div className="contents min-w-0 min-[960px]:flex min-[960px]:flex-1 min-[960px]:flex-col min-[960px]:gap-7">
          <Section
            eyebrow="Beanspruchte Muskeln"
            className="order-3 min-[960px]:order-none"
          >
            {/* Figur nimmt ~78% der Breite (V1-Wert), zentriert - so bleibt
                Abstand zwischen Rand und Illustration, Desktop wie Mobile.
                mt fuer etwas mehr Luft unter der Eyebrow zum Kopf der Figur. */}
            <MuscleMap
              values={muscleValues}
              className="mx-auto mt-3 w-[78%] max-w-[300px]"
            />
          </Section>

          {/* "Uebung anpassen": Desktop unten in der rechten Spalte, mobil ganz
              am Ende (order-5, nach dem Verlauf) - wie V1. */}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="order-5 flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3.5 text-[15px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95 min-[960px]:order-none"
          >
            <Pencil className="size-4" />
            Übung anpassen
          </button>
        </div>
        </div>
      </PageReveal>

      <ExerciseEditModal
        exercise={exercise}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
