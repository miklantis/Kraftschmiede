import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import {
  buzz,
  buzzGoal,
  clickTick,
  ensureAudio,
  goalTick,
  playBeep,
  playGoal,
} from "@/lib/liveAudio";
import type { AudioPrefs } from "@/lib/liveAudio";

// Ergebniszelle einer Skill-Dauer-Uebung (Phase 11, Lieferung 5): Sekunden-Wert
// plus Stoppuhr-Knopf. 1:1 wie V1 (live.js skillWatch):
//   1) Vorlauf-Countdown (5..1, rot) als Zeit zum Einnehmen der Position;
//      schreibt nichts in den Wert, tickt je Sekunde.
//   2) danach die hochzaehlende Stoppuhr -> Wert; piept beim Erreichen des
//      Ziels; der Wert bleibt von Hand ueberschreibbar.
// Nur eine Uhr zugleich: welcher Satz laeuft, steht im Live-Store (skillWatch);
// `active` spiegelt das hier herein. Der Tick laeuft LOKAL (wie die Pausen-
// Leiste), damit das Panel davon unberuehrt bleibt; beim Anhalten (Knopf oder
// Wechsel zu einem anderen Satz) wird der erreichte Wert in den Store committet.

const LEAD_SEC = 5;

export function SkillWatchValue({
  value,
  target,
  active,
  audioPrefs,
  onStart,
  onStop,
  onCommit,
  ariaLabel,
}: {
  value: number | null;
  target: number;
  active: boolean;
  audioPrefs: AudioPrefs;
  onStart: () => void;
  onStop: () => void;
  onCommit: (next: number) => void;
  ariaLabel: string;
}): React.ReactElement {
  const [text, setText] = useState<string>(value == null ? "" : String(value));
  const [running, setRunning] = useState<boolean>(false);
  const [lead, setLead] = useState<boolean>(false);
  const focused = useRef(false);
  const valRef = useRef<number>(value ?? 0);

  // Aeusseren Wert nur uebernehmen, solange weder Uhr laeuft noch getippt wird.
  useEffect(() => {
    if (!active && !focused.current) setText(value == null ? "" : String(value));
  }, [value, active]);

  // Uhr starten/stoppen, wenn sich `active` aendert.
  useEffect(() => {
    if (!active) {
      // Deaktiviert (Knopf oder anderer Satz uebernimmt): erreichten Wert sichern.
      if (running || lead) {
        setRunning(false);
        setLead(false);
        onCommit(valRef.current);
      }
      return;
    }

    const base = value ?? 0;
    valRef.current = base;
    let beeped = false;
    let lastBonusTick = 0;
    let lastLead = -1;
    let leadActive = true;
    const startMs = Date.now();
    ensureAudio();
    setLead(true);
    setRunning(true);
    setText(String(LEAD_SEC));

    const id = window.setInterval(() => {
      if (leadActive) {
        const leftMs = LEAD_SEC * 1000 - (Date.now() - startMs);
        const left = Math.max(0, Math.ceil(leftMs / 1000));
        if (left !== lastLead) {
          lastLead = left;
          setText(String(left));
          if (left > 0) clickTick(true, audioPrefs);
        }
        if (leftMs <= 0) {
          leadActive = false;
          setLead(false);
          playBeep(audioPrefs);
          buzz(audioPrefs);
          valRef.current = base;
          setText(String(base));
        }
        return;
      }
      const elapsed = base + Math.floor((Date.now() - startMs - LEAD_SEC * 1000) / 1000);
      valRef.current = elapsed;
      setText(String(elapsed));
      if (target > 0 && elapsed >= target) {
        if (!beeped) {
          // Zieldauer erreicht: markanter Erfolgs-Dreiklang plus kraeftige
          // Vibration - klar unterscheidbar vom Start-Piep am Countdown-Ende.
          beeped = true;
          lastBonusTick = elapsed;
          playGoal(audioPrefs);
          buzzGoal(audioPrefs);
        } else if (elapsed > lastBonusTick) {
          // Jede weitere volle Sekunde ueber dem Ziel: leiser Bonus-Tick.
          lastBonusTick = elapsed;
          goalTick(audioPrefs);
        }
      }
    }, 100);

    return () => window.clearInterval(id);
    // value/target/audioPrefs werden beim Start eingefroren; nur `active` toggelt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
        className={
          "h-[22px] w-full rounded-[8px] bg-transparent px-1 py-0 text-center font-mono text-[16px] leading-[22px] outline-none focus:bg-muted/70 " +
          (lead ? "text-danger" : "text-foreground")
        }
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
        aria-label={running ? "Stoppuhr anhalten" : "Stoppuhr starten"}
        onClick={() => (active ? onStop() : onStart())}
        className={
          "flex size-[26px] flex-none items-center justify-center rounded-full border transition-colors " +
          (active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground")
        }
      >
        {running ? (
          <Square className="size-[12px]" strokeWidth={2.5} />
        ) : (
          <Play className="size-[13px]" strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}
