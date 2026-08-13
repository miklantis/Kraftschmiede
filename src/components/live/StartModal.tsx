import { useNavigate } from "@tanstack/react-router";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useLatestBody } from "@/hooks/useBody";
import { fmtKg, longDateShort, todayISO } from "@/lib/format";
import type {
  LiveEntry,
  SkillLiveExercise,
  WorkoutSession,
  SkillSession,
} from "@/lib/liveSession";
import { LoadNoteBanner } from "./LoadNoteBanner";

// Start-Popup (vor der Einheit). Nutzt das Overlay-Primitive (Desktop zentriert,
// Mobile Bodenblatt) und zeigt die Vorschau der Saetze - 1:1 wie V1:
//   - Workout (buildStartInner): "Vorschau deiner Saetze", bei fehlendem
//     heutigem Koerperzustand ein Hinweis-Banner, je Uebung eine Karte mit
//     "N x Satz" plus Satz-Chips (Wdh x kg).
//   - Skill (buildSkillStartInner): "N Uebungen · Vorschau", je Uebung eine
//     Karte mit "N x Satz" plus Ziel-Chips (Ziel-Wdh bzw. Ziel-Sekunden); KEIN
//     Koerper-Banner.
// "Los geht's" laesst das Popup ausfahren und danach das Panel hereinfahren.
// In beiden Popups ist der Uebungsname eine Schaltflaeche: sie verwirft den noch
// nicht gestarteten Start (cancelStart) und fuehrt auf die Uebungs-Detailseite.
// Skill-Uebungen ohne Katalog-Verknuepfung bleiben reiner Text.

// Satz-Chip wie V1: "Wdh × kg" mit deutschem Komma (z. B. "7 × 25 kg").
function setChip(reps: number, weight: number): string {
  return reps + " × " + fmtKg(weight) + " kg";
}

// Uebungsname im Kartenkopf. Ohne onOpen (keine Katalog-Uebung hinterlegt)
// bleibt es bei reinem Text - Optik ist in beiden Faellen dieselbe.
function CardTitle({
  name,
  onOpen,
}: {
  name: string;
  onOpen: (() => void) | null;
}): React.ReactElement {
  const base = "text-[15px] font-semibold text-foreground";
  if (onOpen === null) return <span className={base}>{name}</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={name + " öffnen"}
      className={
        base +
        " cursor-pointer rounded-[8px] text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      }
    >
      {name}
    </button>
  );
}

function StartCard({
  entry,
  onOpen,
}: {
  entry: LiveEntry;
  onOpen: () => void;
}): React.ReactElement {
  return (
    <div className="rounded-[14px] bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <CardTitle name={entry.exerciseName} onOpen={onOpen} />
        <span className="text-[13px] text-muted-foreground">
          {entry.sets.length} × Satz
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {entry.sets.map((st, i) => (
          <span
            key={i}
            className="rounded-[10px] bg-muted px-3 py-1.5 font-mono text-[13px] font-medium text-foreground"
          >
            {setChip(st.reps, st.weight)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkillStartCard({
  exercise,
  onOpen,
}: {
  exercise: SkillLiveExercise;
  onOpen: (() => void) | null;
}): React.ReactElement {
  const target =
    exercise.metric === "duration" ? exercise.target + " s" : exercise.target + " Wdh";
  return (
    <div className="rounded-[14px] bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <CardTitle name={exercise.name} onOpen={onOpen} />
        <span className="text-[13px] text-muted-foreground">
          {exercise.sets.length} × Satz
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {exercise.sets.map((_, i) => (
          <span
            key={i}
            className="rounded-[10px] bg-muted px-3 py-1.5 font-mono text-[13px] font-medium text-foreground"
          >
            {target}
          </span>
        ))}
      </div>
    </div>
  );
}

// Nachschlagen vor dem Start: Start verwerfen, dann zur Uebungsseite. Beide
// Vorschauen nutzen dasselbe Verhalten.
function useToExercise(): (exerciseId: string) => void {
  const navigate = useNavigate();
  const live = useLiveSession();
  return (exerciseId: string): void => {
    live.cancelStart();
    void navigate({ to: "/uebungen/$exerciseId", params: { exerciseId } });
  };
}

function WorkoutPreview({ p }: { p: WorkoutSession }): React.ReactElement {
  const navigate = useNavigate();
  const bodyQ = useLatestBody();
  const live = useLiveSession();
  const toExercise = useToExercise();
  // Banner nur, wenn heute noch kein Koerperzustand erfasst ist (V1 todayBody()).
  const todayBodyDone = bodyQ.data?.date === todayISO();
  // Woraus der Coach heute rechnet: letzter Eintrag mit Datum, sonst neutral.
  const basisText = bodyQ.data
    ? "Der Coach rechnet mit deinem Eintrag vom " +
      longDateShort(bodyQ.data.date) +
      "."
    : "Der Coach rechnet neutral – noch kein Befinden erfasst.";
  const toBody = (): void => {
    live.cancelStart();
    void navigate({ to: "/koerper" });
  };
  return (
    <>
      <div className="mb-3 text-[13px] text-muted-foreground">
        {p.entries.length} Übungen · Vorschau deiner Sätze
      </div>
      {p.loadNote !== null && (
        <LoadNoteBanner text={p.loadNote} className="mb-4" />
      )}
      {!todayBodyDone && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-warning/30 bg-warning/10 px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold text-warning-foreground">
              Körperzustand noch nicht erfasst
            </div>
            <div className="mt-0.5 text-[13px] text-warning-foreground/80">
              {basisText}
            </div>
          </div>
          <button
            type="button"
            onClick={toBody}
            className="flex-none rounded-[10px] border border-warning/40 bg-card px-3.5 py-2 text-[14px] font-semibold text-warning-foreground"
          >
            Eintragen
          </button>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3">
        {p.entries.map((entry, i) => (
          <StartCard
            key={entry.exerciseId + i}
            entry={entry}
            onOpen={() => toExercise(entry.exerciseId)}
          />
        ))}
      </div>
    </>
  );
}

function SkillPreview({ p }: { p: SkillSession }): React.ReactElement {
  const toExercise = useToExercise();
  return (
    <>
      <div className="mb-3 text-[13px] text-muted-foreground">
        {p.exercises.length} Übungen · Vorschau
      </div>
      {p.mastered && (
        <div className="mb-4 rounded-[14px] border border-skill/30 bg-skill/10 px-4 py-3 text-[14px] font-medium text-foreground">
          Skill gemeistert – Erhaltungstraining der letzten Phase.
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3">
        {p.exercises.map((ex, i) => {
          // Aeltere, noch laufende Einheiten aus dem Speicher kennen das Feld
          // nicht - dann bleibt der Name reiner Text.
          const id = ex.exerciseId ?? null;
          return (
            <SkillStartCard
              key={ex.name + i}
              exercise={ex}
              onOpen={
                id === null
                  ? null
                  : () => {
                      toExercise(id);
                    }
              }
            />
          );
        })}
      </div>
    </>
  );
}

export function StartModal(): React.ReactElement {
  const live = useLiveSession();
  const p = live.pending;
  const isSkill = p?.kind === "skill";

  return (
    <Overlay
      open={p != null}
      onClose={live.cancelStart}
      title={p ? (isSkill ? "Skill " + p.title : p.title) + " starten" : undefined}
    >
      {p && (
        <>
          {/* Der 1RM-Test hat kein Start-Popup (er startet direkt von der
              Uebungsseite) - hier kommen nur Workout und Skill an. */}
          {p.kind === "skill" ? (
            <SkillPreview p={p} />
          ) : p.kind === "workout" ? (
            <WorkoutPreview p={p} />
          ) : null}

          <Button
            onClick={live.confirmStart}
            className="h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
          >
            Los geht’s
          </Button>
          <Button
            variant="outline"
            onClick={live.cancelStart}
            className="mt-2 h-auto w-full rounded-[14px] py-3.5 text-base leading-tight min-[960px]:hidden"
          >
            Abbrechen
          </Button>
        </>
      )}
    </Overlay>
  );
}
