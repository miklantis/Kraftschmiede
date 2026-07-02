import { useState } from "react";
import type { ComponentType } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Zap } from "lucide-react";
import { WorkoutIcon, YogaIcon } from "@/components/ui/training-icons";
import type { HistorySession, HistoryKind } from "@/lib/history";

// Aufklappbare Karte einer Einheit (Optik 1:1 aus V1 ks-log-card). Zugeklappt:
// Farbpunkt nach Typ, Titel, Typ-Pille, Datum, Chevron. Aufgeklappt: die
// Session-Zusammenfassung (Dauer, dann je Uebung ein Kopf mit den Saetzen
// einzeln darunter als Bullet-Zeilen) und das Loeschen mit Rueckfrage.
// Offen-/Loesch-Zustand haelt die Karte selbst; das eigentliche Loeschen reicht
// sie ueber onDelete nach oben.

// Typ-Symbol je Einheit, in der jeweiligen Typfarbe (ersetzt den frueheren
// Farbpunkt): Form traegt den Typ, Farbe das Signal. Eine Abweichung ist eine
// Kraft-Einheit, daher Stoppuhr in Bernstein.
const ICON: Record<HistoryKind, ComponentType<{ className?: string }>> = {
  kraft: WorkoutIcon,
  skill: Zap,
  yoga: YogaIcon,
  dev: WorkoutIcon,
};

const TONE: Record<HistoryKind, string> = {
  kraft: "text-primary",
  skill: "text-skill",
  yoga: "text-yoga",
  dev: "text-deviation",
};

export function SessionLogCard({
  session,
  onDelete,
  onEdit,
  deleting = false,
}: {
  session: HistorySession;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  deleting?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const Icon = ICON[session.kind];

  return (
    <div className="overflow-hidden rounded-[16px] bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-primary/5"
      >
        <Icon className={"size-[18px] flex-none " + TONE[session.kind]} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
          {session.title}
        </span>
        <span className="flex-none text-[12px] whitespace-nowrap text-[#b0b0b6]">
          {session.dateLabel}
        </span>
        {open ? (
          <ChevronUp className="size-4 flex-none text-[#c4c4c9]" />
        ) : (
          <ChevronDown className="size-4 flex-none text-[#c4c4c9]" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 pt-1 pb-3.5">
          {session.durationLabel && (
            <div className="border-b border-[#f6f6f8] py-[9px]">
              <div className="text-[14px] font-semibold text-foreground">Dauer</div>
              <ul className="mt-1 flex flex-col gap-0.5">
                <li className="flex items-baseline gap-2 font-mono text-[13px] text-muted-foreground">
                  <span className="flex-none text-primary/40">•</span>
                  <span>{session.durationLabel}</span>
                </li>
              </ul>
            </div>
          )}
          {session.detail.map((row, i) => (
            <div
              key={i}
              className="border-b border-[#f6f6f8] py-[9px]"
            >
              <div className="text-[14px] font-semibold text-foreground">
                {row.label}
              </div>
              <ul className="mt-1 flex flex-col gap-0.5">
                {row.lines.map((line, j) => (
                  <li
                    key={j}
                    className="flex items-baseline gap-2 font-mono text-[13px] text-muted-foreground"
                  >
                    <span className="flex-none text-primary/40">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {confirm ? (
            <div className="flex flex-col gap-2.5 pt-3.5">
              <span className="text-[13px] text-muted-foreground">
                Eintrag wird gelöscht – sicher?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="rounded-control bg-secondary px-3.5 py-2 text-[13px] font-semibold text-foreground"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => onDelete(session.id)}
                  className="rounded-control bg-danger px-3.5 py-2 text-[13px] font-semibold text-danger-foreground disabled:opacity-50"
                >
                  {deleting ? "Löschen …" : "Löschen"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 pt-2.5">
              {onEdit &&
                (session.kind === "kraft" ||
                  session.kind === "dev" ||
                  session.kind === "skill" ||
                  session.kind === "yoga") && (
                <button
                  type="button"
                  aria-label="Einheit bearbeiten"
                  title="Bearbeiten"
                  onClick={() => onEdit(session.id)}
                  className="flex size-9 items-center justify-center rounded-control bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                  <Pencil className="size-[17px]" />
                </button>
              )}
              <button
                type="button"
                aria-label="Eintrag löschen"
                title="Löschen"
                onClick={() => setConfirm(true)}
                className="flex size-9 items-center justify-center rounded-control bg-danger/10 text-danger transition-colors hover:bg-danger/20"
              >
                <Trash2 className="size-[17px]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
