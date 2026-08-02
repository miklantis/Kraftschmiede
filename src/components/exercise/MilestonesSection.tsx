import { useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Section } from "@/components/ui/section";
import { ProgressToGoal } from "@/components/ui/progress-to-goal";
import { MilestoneEditModal } from "./MilestoneEditModal";
import { useMilestones } from "@/hooks/useMilestones";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";
import type { ExerciseMilestoneRow } from "@/schemas";

// Abschnitt "Meilensteine" auf der Uebungs-Detailseite. Zeigt die selbst
// angelegten Meilensteine je Uebung mit Fortschritt gegen das aktuelle 1RM
// (currentRm, nur gelesen). Offene zuerst, erreichte darunter als Historie.
// Anlegen/Bearbeiten/Loeschen laufen ueber das Popup. Erreicht das 1RM ein
// offenes Ziel, wird der Meilenstein automatisch mit dem heutigen Datum
// gestempelt (einmalig; DB-seitig zusaetzlich gegen Ueberschreiben gesichert).
export function MilestonesSection({
  exerciseId,
  currentRm,
  unit,
}: {
  exerciseId: string;
  currentRm: number | null;
  unit: string;
}): React.ReactElement {
  const milestonesQ = useMilestones(exerciseId);
  const { markAchieved } = useMilestoneActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseMilestoneRow | null>(null);

  // Auto-"erreicht": jedes offene Ziel, das vom aktuellen 1RM erreicht wird,
  // einmal stempeln. firedRef verhindert Doppel-Ausloesung innerhalb der
  // Lebensdauer; die Mutation ist DB-seitig zusaetzlich idempotent.
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (currentRm == null) return;
    const rows = milestonesQ.data;
    if (!rows) return;
    for (const m of rows) {
      if (
        m.achieved_at == null &&
        currentRm >= m.target_rm &&
        !firedRef.current.has(m.id)
      ) {
        firedRef.current.add(m.id);
        void markAchieved(m.id);
      }
    }
  }, [milestonesQ.data, currentRm, markAchieved]);

  const openAdd = (): void => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (m: ExerciseMilestoneRow): void => {
    setEditing(m);
    setModalOpen(true);
  };

  const rows = milestonesQ.data ?? [];
  const offen = rows.filter((m) => m.achieved_at == null);
  const erreicht = rows
    .filter((m) => m.achieved_at != null)
    .sort((a, b) => (a.achieved_at! < b.achieved_at! ? 1 : -1));

  const card = (m: ExerciseMilestoneRow): React.ReactElement => (
    <div key={m.id} className="rounded-[18px] bg-card p-4 shadow-card">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <span className="text-[15px] font-semibold text-foreground">
          {m.name}
        </span>
        <button
          type="button"
          onClick={() => openEdit(m)}
          aria-label="Meilenstein bearbeiten"
          className="-m-1.5 flex-none rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>
      <ProgressToGoal
        current={currentRm}
        target={m.target_rm}
        unit={unit}
        achievedAt={m.achieved_at}
      />
    </div>
  );

  return (
    <Section eyebrow="Meilensteine">
      {milestonesQ.isLoading ? (
        <p className="text-[15px] text-muted-foreground">Wird geladen …</p>
      ) : rows.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">
          Noch keine Meilensteine. Leg dir ein Ziel-1RM für diese Übung an.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {offen.map(card)}
          {erreicht.length > 0 && (
            <>
              {offen.length > 0 && (
                <div className="mt-1 px-0.5 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
                  Erreicht
                </div>
              )}
              {erreicht.map(card)}
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95"
      >
        <Plus className="size-4" />
        Meilenstein hinzufügen
      </button>

      <MilestoneEditModal
        exerciseId={exerciseId}
        milestone={editing}
        unit={unit}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Section>
  );
}
