import { useNavigate } from "@tanstack/react-router";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useLatestBody } from "@/hooks/useBody";
import { fmtKg, todayISO } from "@/lib/format";
import type {
  LiveEntry,
  SkillLiveExercise,
  WorkoutSession,
  SkillSession,
} from "@/lib/liveSession";

// Start-Popup (vor der Einheit). Nutzt das Overlay-Primitive (Desktop zentriert,
// Mobile Bodenblatt) und zeigt die Vorschau der Saetze - 1:1 wie V1:
//   - Workout (buildStartInner): "Vorschau deiner Saetze", bei fehlendem
//     heutigem Koerperzustand ein Hinweis-Banner, je Uebung eine Karte mit
//     "N x Satz" plus Satz-Chips (Wdh x kg).
//   - Skill (buildSkillStartInner): "N Uebungen · Vorschau", je Uebung eine
//     Karte mit "N x Satz" plus Ziel-Chips (Ziel-Wdh bzw. Ziel-Sekunden); KEIN
//     Koerper-Banner.
// "Los geht's" laesst das Popup ausfahren und danach das Panel hereinfahren.

// Satz-Chip wie V1: "Wdh × kg" mit deutschem Komma (z. B. "7 × 25 kg").
function setChip(reps: number, weight: number): string {
  return reps + " × " + fmtKg(weight) + " kg";
}

function StartCard({ entry }: { entry: LiveEntry }): React.ReactElement {
  return (
    <div className="rounded-[14px] bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-foreground">
          {entry.exerciseName}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {entry.sets.length} × Satz
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {entry.sets.map((st, i) => (
          <span
            key={i}
            className="rounded-[10px] bg-secondary px-3 py-1.5 font-mono text-[13px] font-medium text-foreground"
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
}: {
  exercise: SkillLiveExercise;
}): React.ReactElement {
  const target =
    exercise.metric === "duration" ? exercise.target + " s" : exercise.target + " Wdh";
  return (
    <div className="rounded-[14px] bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-foreground">{exercise.name}</span>
        <span className="text-[13px] text-muted-foreground">
          {exercise.sets.length} × Satz
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {exercise.sets.map((_, i) => (
          <span
            key={i}
            className="rounded-[10px] bg-secondary px-3 py-1.5 font-mono text-[13px] font-medium text-foreground"
          >
            {target}
          </span>
        ))}
      </div>
    </div>
  );
}

function WorkoutPreview({ p }: { p: WorkoutSession }): React.ReactElement {
  const navigate = useNavigate();
  const bodyQ = useLatestBody();
  const live = useLiveSession();
  // Banner nur, wenn heute noch kein Koerperzustand erfasst ist (V1 todayBody()).
  const todayBodyDone = bodyQ.data?.date === todayISO();
  const toBody = (): void => {
    live.cancelStart();
    void navigate({ to: "/koerper" });
  };
  return (
    <>
      <div className="mb-3 text-[13px] text-muted-foreground">
        {p.entries.length} Übungen · Vorschau deiner Sätze
      </div>
      {!todayBodyDone && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-warning/30 bg-warning/10 px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold text-warning-foreground">
              Körperzustand noch nicht erfasst
            </div>
            <div className="mt-0.5 text-[13px] text-warning-foreground/80">
              Kurz eintragen → bessere Gewichtsvorschläge.
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
          <StartCard key={entry.exerciseId + i} entry={entry} />
        ))}
      </div>
    </>
  );
}

function SkillPreview({ p }: { p: SkillSession }): React.ReactElement {
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
        {p.exercises.map((ex, i) => (
          <SkillStartCard key={ex.name + i} exercise={ex} />
        ))}
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
          {p.kind === "skill" ? <SkillPreview p={p} /> : <WorkoutPreview p={p} />}

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
