import { AccordionItem } from "@/components/ui/accordion";
import { SkillPhaseList } from "./SkillPhaseList";
import type { MySkillView } from "@/hooks/useSkillsView";

// Karte eines aktiven Skills: Kopf mit Name, aktueller Phase, Zaehler und
// Status (gemeistert / Geraet fehlt). Aufgeklappt zeigt sie alle Phasen und die
// manuellen Aktionen: deaktivieren (Fortschritt bleibt), Phase zurueck,
// zuruecksetzen. Phase zurueck und zuruecksetzen fragen vorher nach.
export function MySkillCard({
  model,
  busy,
  onDeactivate,
  onRegress,
  onReset,
}: {
  model: MySkillView;
  busy: boolean;
  onDeactivate: () => void;
  onRegress: () => void;
  onReset: () => void;
}): React.ReactElement {
  const statusPill = model.mastered ? (
    <span className="flex-none rounded-pill bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
      Gemeistert
    </span>
  ) : !model.startable ? (
    <span className="flex-none rounded-pill bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">
      Gerät fehlt
    </span>
  ) : null;

  const header = (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-semibold text-foreground min-[960px]:text-[15px]">
          {model.name}
        </div>
        <div className="mt-px text-[13px] text-muted-foreground">
          Phase {model.phaseIndex + 1}/{model.phaseCount} · {model.phaseLabel}
        </div>
        <div className="text-[12px] text-[#a0a0a5]">{model.counterText}</div>
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

  return (
    <AccordionItem header={header}>
      {model.missingEquipment.length > 0 && (
        <p className="mb-3 text-[13px] text-warning">
          Fehlt für die aktuelle Phase: {model.missingEquipment.join(", ")}.
          In den Einstellungen freischalten, sobald vorhanden.
        </p>
      )}
      <SkillPhaseList phases={model.phases} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onDeactivate}
          className="rounded-control bg-secondary px-3.5 py-2 text-[13px] font-semibold text-foreground hover:brightness-95 disabled:opacity-60"
        >
          Deaktivieren
        </button>
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
    </AccordionItem>
  );
}
