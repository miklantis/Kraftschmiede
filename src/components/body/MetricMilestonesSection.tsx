import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Section } from "@/components/ui/section";
import { MetricMilestoneEditModal } from "./MetricMilestoneEditModal";
import { fmtWeight } from "@/lib/format";
import type { CompositionMilestoneRow } from "@/schemas";

// Abschnitt "Meilensteine" der Koerper-Seite, gebunden an die gerade gewaehlte
// Mess-Metrik. Zeigt die selbst angelegten Richtwerte dieser Metrik als
// schlichte Liste (Name + Zielwert, dazu der aktuelle Messwert als Kontext).
// Kein Erreicht-Zustand, kein Fortschrittsbalken – der Sinn liegt in der
// Ziel-Linie im Diagramm. Anlegen/Bearbeiten/Loeschen laufen ueber das Popup.
export function MetricMilestonesSection({
  metric,
  metricLabel,
  unit,
  current,
  milestones,
}: {
  metric: string;
  metricLabel: string;
  unit: string;
  current: number | null;
  milestones: readonly CompositionMilestoneRow[];
}): React.ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompositionMilestoneRow | null>(null);

  const openAdd = (): void => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (m: CompositionMilestoneRow): void => {
    setEditing(m);
    setModalOpen(true);
  };

  const card = (m: CompositionMilestoneRow): React.ReactElement => (
    <div key={m.id} className="rounded-[18px] bg-card p-4 shadow-card">
      <div className="mb-1.5 flex items-start justify-between gap-3">
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
      <div className="text-[13px] text-muted-foreground">
        <span className="text-muted-foreground">Ziel </span>
        <span className="font-mono font-semibold tabular-nums text-foreground">
          {fmtWeight(m.target, unit)}
        </span>
        {current != null && (
          <>
            {" · aktuell "}
            <span className="font-mono tabular-nums">
              {fmtWeight(current, unit)}
            </span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Section eyebrow="Meilensteine">
      {milestones.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">
          Noch keine Meilensteine für {metricLabel}. Leg dir einen Zielwert an –
          er erscheint als Linie im Verlauf.
        </p>
      ) : (
        <div className="flex flex-col gap-3">{milestones.map(card)}</div>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95"
      >
        <Plus className="size-4" />
        Meilenstein hinzufügen
      </button>

      <MetricMilestoneEditModal
        metric={metric}
        metricLabel={metricLabel}
        milestone={editing}
        unit={unit}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Section>
  );
}
