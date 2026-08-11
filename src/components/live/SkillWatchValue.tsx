import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { ensureAudio } from "@/lib/liveAudio";

// Ergebniszelle einer Skill-Dauer-Uebung (Phase 11, Lieferung 5): Sekunden-Wert
// plus Stoppuhr-Knopf. Der Wert bleibt jederzeit von Hand ueberschreibbar.
//
// Seit Vorhaben #102 tickt hier nichts mehr: laeuft die Uhr, uebernimmt die
// grosse Timer-Ansicht (DurationTimerOverlay) Vorbereitung, Zaehlen, Toene und
// das Zurueckschreiben des Werts. Diese Zelle sagt nur noch, welcher Satz
// gemeint ist, und zeigt das Ergebnis. Nur eine Uhr zugleich: welcher Satz
// laeuft, steht im Live-Store (skillWatch); `active` spiegelt das hier herein.

export function SkillWatchValue({
  value,
  active,
  onStart,
  onStop,
  onCommit,
  ariaLabel,
}: {
  value: number | null;
  active: boolean;
  onStart: () => void;
  onStop: () => void;
  onCommit: (next: number) => void;
  ariaLabel: string;
}): React.ReactElement {
  const [text, setText] = useState<string>(value == null ? "" : String(value));
  const focused = useRef(false);

  // Aeusseren Wert nur uebernehmen, solange weder Uhr laeuft noch getippt wird.
  useEffect(() => {
    if (!active && !focused.current) setText(value == null ? "" : String(value));
  }, [value, active]);

  function commitText(): void {
    const trimmed = text.trim();
    if (trimmed === "") {
      setText(value == null ? "" : String(value));
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setText(value == null ? "" : String(value));
      return;
    }
    onCommit(parsed);
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        readOnly={active}
        className="h-[22px] w-full rounded-[8px] bg-transparent px-1 py-0 text-center font-mono text-[16px] leading-[22px] text-foreground outline-none focus:bg-muted/70"
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          focused.current = false;
          if (!active) commitText();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <button
        type="button"
        aria-label={active ? "Stoppuhr anhalten" : "Stoppuhr starten"}
        onClick={() => {
          if (active) {
            onStop();
            return;
          }
          // Erste Geste: der Ton-Kontext darf nur daraus geweckt werden.
          ensureAudio();
          onStart();
        }}
        className={
          "flex size-[26px] flex-none items-center justify-center rounded-full border transition-colors " +
          (active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground")
        }
      >
        {active ? (
          <Square className="size-[12px]" strokeWidth={2.5} />
        ) : (
          <Play className="size-[13px]" strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}
