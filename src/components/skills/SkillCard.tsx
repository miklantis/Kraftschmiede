import { AccordionItem } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { SkillPhaseList } from "./SkillPhaseList";
import type { SkillCardView } from "@/hooks/useSkillsView";

// Ein Skill als Karte. Der Schalter rechts aktiviert/deaktiviert (Fortschritt
// bleibt erhalten). Aufgeklappt zeigt die Karte alle Phasen; bei aktivem Skill
// zusaetzlich die manuellen Aktionen Phase zurueck und zuruecksetzen (beide mit
// Rueckfrage). Inaktive zeigen im Kopf die Phasenzahl bzw. den pausierten Stand.
export function SkillCard({
  model,
  busy,
  onToggle,
  onRegress,
  onReset,
}: {
  model: SkillCardView;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onRegress: () => void;
  onReset: () => void;
}): React.ReactElement {
  const statusPill = model.mastered ? (
    <span className="flex-none rounded-pill bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
      Gemeistert
    </span>
  ) : model.active && !model.startable ? (
    <span className="flex-none rounded-pill bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">
      Gerät fehlt
    </span>
  ) : null;

  // Unterzeile: aktiv -> Phase + Zaehler; inaktiv mit Fortschritt -> pausiert;
  // inaktiv ohne Fortschritt -> nur Phasenzahl.
  const subline = model.active
    ? `Phase ${model.phaseIndex + 1}/${model.phaseCount} · ${model.phaseLabel}`
    : model.hasProgress
      ? `Pausiert · Phase ${model.phaseIndex + 1}/${model.phaseCount}`
      : `${model.phaseCount} Phasen`;

  const header = (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-semibold text-foreground min-[960px]:text-[15px]">
          {model.name}
        </div>
        <div className="mt-px text-[13px] text-muted-foreground">{subline}</div>
        {model.active && (
          <div className="text-[12px] text-[#a0a0a5]">{model.counterText}</div>
        )}
      </div>
      {statusPill}
    </div>
  );

  function confirmRegress(): void {
    if (window.confirm("Eine Phase zurückgehen? Der Zähler wird auf 0 gesetzt.")) {
      onRegress();
    }
  }
  function confirmReset(): void {
    if (
      window.confirm(
        "Diesen Skill auf Phase 1 zurücksetzen? Der Fortschritt geht verloren.",
      )
    ) {
      onReset();
    }
  }

  const toggle = (
    <Switch
      checked={model.active}
      disabled={busy}
      onChange={onToggle}
      label={model.active ? `${model.name} deaktivieren` : `${model.name} aktivieren`}
    />
  );

  return (
    <AccordionItem header={header} trailing={toggle}>
      {model.active && model.missingEquipment.length > 0 && (
        <p className="mb-3 text-[13px] text-warning">
          Fehlt für die aktuelle Phase: {model.missingEquipment.join(", ")}.
          In den Einstellungen freischalten, sobald vorhanden.
        </p>
      )}
      <SkillPhaseList phases={model.phases} />
      {model.active && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !model.canRegress}
            onClick={confirmRegress}
            className="rounded-control bg-secondary px-3.5 py-2 text-[13px] font-semibold text-foreground hover:brightness-95 disabled:opacity-40"
          >
            Phase zurück
          </button>
          <button
            type="button"
            disabled={busy || !model.canReset}
            onClick={confirmReset}
            className="rounded-control px-3.5 py-2 text-[13px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"
          >
            Zurücksetzen
          </button>
        </div>
      )}
    </AccordionItem>
  );
}
