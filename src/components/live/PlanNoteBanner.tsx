import type { PlanNote } from "@/lib/planNote";

// Hinweis des Wochenplans (Issue #225, Schritt 5): steht im Start-Popup ueber
// den Satz-Karten und im laufenden Panel ganz oben - dieselbe Stelle und
// dieselbe Optik wie der Lastfaktor-Hinweis, damit der Trainingsbildschirm
// nicht zwei Sprachen spricht. Text kommt fertig aus lib/planNote und ist auf
// die laufende Einheit eingefroren.
export function PlanNoteBanner({
  note,
  className = "",
}: {
  note: PlanNote;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={
        "rounded-[14px] border border-primary/30 bg-primary/10 px-4 py-3 " +
        className
      }
    >
      <div className="text-[14px] font-semibold leading-snug text-foreground">
        {note.title}
      </div>
      <div className="mt-1 font-mono text-[13.5px] font-semibold leading-snug text-foreground">
        {note.targets}
      </div>
      <div className="mt-1.5 text-[13px] leading-snug text-foreground">
        {note.progress}
      </div>
      {note.hint !== null && (
        <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
          {note.hint}
        </div>
      )}
    </div>
  );
}
