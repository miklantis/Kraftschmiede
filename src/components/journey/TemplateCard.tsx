import { useState } from "react";
import { PeriodizationChart } from "@/components/journey/PeriodizationChart";
import { PhaseList } from "@/components/journey/PhaseList";
import type { PeriodizationData } from "@/lib/periodization";
import type { PhaseView } from "@/lib/journey";

// Anzeige-Modell einer Vorlagenkarte (reine Strings/Flags). Die Phasen werden
// nicht mehr als Chips, sondern als Kurve gezeigt (periodization als eigene Prop).
export interface TemplateCardModel {
  id: string;
  name: string;
  duration: string; // z. B. "12 Wochen · 4 Phasen"
  tagline: string;
  forWhom: string;
  summary: string;
  active: boolean;
}

// Eine Vorlage im Waehler: Name, Dauer, Kurzbeschreibung, "Fuer wen",
// Zusammenfassung, die komplette Journey als Periodisierungskurve (Phasen als
// Baender, ohne "jetzt"-Marker), einen aufklappbaren Phasen-Ablauf wie auf der
// Journey-Seite und den Startknopf. Die aktive Vorlage zeigt einen
// ruhenden Status statt eines Knopfs. Optik aus V1 (jr-tpl).
//
// `switching` sagt, dass bereits eine Journey laeuft: dann heisst der Knopf
// "Zu dieser Journey wechseln" statt "Diese Journey starten" - man sieht vor
// dem Klick, dass hier etwas endet (Issue #257).
export function TemplateCard({
  model,
  periodization,
  phases,
  busy,
  switching,
  onStart,
}: {
  model: TemplateCardModel;
  periodization: PeriodizationData;
  phases: PhaseView[];
  busy: boolean;
  /** Laeuft bereits eine Journey? Aendert nur den Knopftext. */
  switching: boolean;
  onStart: () => void;
}): React.ReactElement {
  // Zugeklappt, damit die Liste scanbar bleibt; der Ablauf wird je Vorlage
  // gezielt geoeffnet.
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col rounded-[18px] bg-card p-4 shadow-card min-[960px]:p-[22px]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-[16px] font-bold text-foreground min-[960px]:text-[18px]">
          {model.name}
        </span>
        <span className="flex-none rounded-[7px] bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          {model.duration}
        </span>
      </div>
      {model.tagline !== "" && (
        <div className="mb-2 text-[13px] font-semibold text-primary min-[960px]:mb-3 min-[960px]:text-[14px]">
          {model.tagline}
        </div>
      )}
      {model.forWhom !== "" && (
        <div className="mb-1.5 text-[12px] leading-[1.5] text-foreground-subtle min-[960px]:text-[13px]">
          <strong className="font-semibold text-muted-foreground">Für:</strong>{" "}
          {model.forWhom}
        </div>
      )}
      {model.summary !== "" && (
        <div className="mb-3 flex-1 text-[12px] leading-[1.5] text-muted-foreground min-[960px]:mb-3.5 min-[960px]:text-[13px] min-[960px]:leading-[1.55]">
          {model.summary}
        </div>
      )}
      {periodization.weeks.length > 0 && (
        <div className="mb-3.5 min-[960px]:mb-[18px]">
          <PeriodizationChart data={periodization} showNow={false} />
        </div>
      )}
      {phases.length > 0 && (
        <div className="mb-3.5 min-[960px]:mb-[18px]">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="w-full rounded-control border border-border py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? "Phasen ausblenden" : "Phasen ansehen"}
          </button>
          {open && (
            <div className="mt-3">
              <PhaseList phases={phases} variant="preview" />
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        disabled={busy || model.active}
        onClick={onStart}
        className={
          "w-full rounded-control py-3 text-sm font-semibold transition-[filter] " +
          (model.active
            ? "cursor-default bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:brightness-105 disabled:opacity-60")
        }
      >
        {model.active
          ? "✓ Aktive Journey"
          : switching
            ? "Zu dieser Journey wechseln"
            : "Diese Journey starten"}
      </button>
    </div>
  );
}
