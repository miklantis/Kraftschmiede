import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { HistorySession, HistoryKind } from "@/lib/history";

// Aufklappbare Karte einer Einheit (Optik 1:1 aus V1 ks-log-card). Zugeklappt:
// Farbpunkt nach Typ, Titel, Typ-Pille, Datum, Chevron. Aufgeklappt: die
// Session-Zusammenfassung (Dauer + eine Zeile je Uebung) und das Loeschen mit
// Rueckfrage. Offen-/Loesch-Zustand haelt die Karte selbst; das eigentliche
// Loeschen reicht sie ueber onDelete nach oben.

const DOT: Record<HistoryKind, string> = {
  kraft: "bg-primary",
  skill: "bg-skill",
  yoga: "bg-yoga",
  dev: "bg-deviation",
};

const TAG: Record<HistoryKind, string> = {
  kraft: "text-primary bg-primary/12",
  skill: "text-skill-foreground bg-skill/15",
  yoga: "text-yoga-foreground bg-yoga/15",
  dev: "text-deviation-foreground bg-deviation/20",
};

export function SessionLogCard({
  session,
  onDelete,
  deleting = false,
}: {
  session: HistorySession;
  onDelete: (id: string) => void;
  deleting?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="overflow-hidden rounded-[16px] bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-primary/5"
      >
        <span className={"size-2.5 flex-none rounded-full " + DOT[session.kind]} />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-foreground">
            {session.title}
          </span>
          <span
            className={
              "flex-none rounded-md px-[7px] py-0.5 text-[10px] font-bold " +
              TAG[session.kind]
            }
          >
            {session.tagLabel}
          </span>
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
            <div className="flex items-center justify-between border-b border-[#f6f6f8] py-[9px]">
              <span className="text-[13px] text-muted-foreground">Dauer</span>
              <span className="font-mono text-[13px] font-semibold text-foreground">
                {session.durationLabel}
              </span>
            </div>
          )}
          {session.detail.map((row, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-3 border-b border-[#f6f6f8] py-[9px]"
            >
              <span className="flex-none text-[14px] font-semibold text-foreground">
                {row.label}
              </span>
              <span className="text-right font-mono text-[13px] text-muted-foreground">
                {row.info}
              </span>
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
            <div className="pt-2.5">
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-danger hover:opacity-80"
              >
                <Trash2 className="size-[13px]" />
                Eintrag löschen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
