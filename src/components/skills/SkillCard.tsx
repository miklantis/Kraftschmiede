import { Zap } from "lucide-react";
import { AccordionItem } from "@/components/ui/accordion";
import { PhaseBar } from "@/components/ui/phase-bar";
import { SkillPhaseList } from "./SkillPhaseList";
import { SkillTitle } from "./SkillTitle";
import type { SkillCardView } from "@/hooks/useSkillsView";

// Ein Skill als Karte. Jeder Skill ist immer aktiv (kein Aktiv-Schalter mehr).
// Aufgeklappt zeigt die Karte alle Phasen und die manuellen Aktionen Phase
// zurueck und zuruecksetzen (beide mit Rueckfrage).
export function SkillCard({
  model,
  busy,
  onRegress,
  onReset,
}: {
  model: SkillCardView;
  busy: boolean;
  onRegress: () => void;
  onReset: () => void;
}): React.ReactElement {
  // Kopf wie die Skill-Zeile auf der Trainingsseite: Symbol, Name mit dem
  // Phasennamen daneben, darunter der Balken. Zusatzhinweise ("Gerät fehlt",
  // "Gemeistert") stehen aufgeklappt im Kartentext, nicht mehr im Kopf.
  //
  // Aufgeklappt zeigt die Phasenliste denselben Stand ausfuehrlich - der Balken
  // waere doppelt. Er wird nur unsichtbar geschaltet, behaelt also seinen Platz,
  // damit die Kopfhoehe beim Auf- und Zuklappen gleich bleibt.
  const header = ({ open }: { open: boolean }): React.ReactElement => (
    <div className="flex items-center gap-3">
      <Zap className="size-5 flex-none text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <SkillTitle name={model.name} phaseLabel={model.phaseLabel} />
        <PhaseBar
          index={model.phaseIndex}
          count={model.phaseCount}
          mastered={model.mastered}
          className={"mt-1.5 " + (open ? "invisible" : "")}
        />
      </div>
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
      {model.counterText !== "" && (
        <p className="mb-3 text-[13px] text-muted-foreground">
          {model.counterText}
        </p>
      )}
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
          disabled={busy || !model.canRegress}
          onClick={confirmRegress}
          className="rounded-control bg-muted px-3.5 py-2 text-[13px] font-semibold text-foreground hover:brightness-95 disabled:opacity-40"
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
