import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { durTick, LEAD_SEC } from "@/lib/durationTimer";
import type { DurTick } from "@/lib/durationTimer";
import { fmtDur } from "@/lib/liveSession";
import { useScrollLock } from "@/hooks/useScrollLock";
import { ProgressRing } from "@/components/ui/progress-ring";

// Grosse Timer-Ansicht der Dauer-Uebungen (Vorhaben #102, Schritt 2). Dunkle
// Karte im Stil der Pausen-Leiste, aber kompakt-rechteckig und etwa halb so hoch
// wie der Bildschirm: dicker Fortschrittsring, grosse Zahl in der Mitte.
//
// Der Takt laeuft hier lokal (100 ms) wie in der Pausen-Leiste, damit das
// Live-Panel davon unberuehrt bleibt; gerechnet wird nichts selbst, das
// uebernimmt durTick(). Beendet wird per Tipp irgendwo, ueber den Knopf oder
// mit Escape - der erreichte Wert geht dann nach oben.
//
// Toene und Vibration bleiben exakt wie in der bisherigen Zelle: Ticks in der
// Vorbereitung, Piep zum Start, Erfolgs-Dreiklang beim Ziel, leise Bonus-Ticks
// je weiterer Sekunde darueber.

const RING_STROKE = 16;

function ringSizeFor(w: number, h: number): number {
  return Math.round(Math.max(168, Math.min(252, Math.min(w * 0.56, h * 0.26))));
}

/** Grosse Zahl: bis 99 Sekunden schlicht, darueber als m:ss lesbarer. */
function bigValue(sec: number): string {
  return sec < 100 ? String(sec) : fmtDur(sec);
}

export function DurationTimerOverlay({
  exerciseName,
  setLabel,
  target,
  baseValue,
  audioPrefs,
  onEnd,
}: {
  exerciseName: string;
  /** Kurzer Zusatz im Kopf, z. B. "Satz 2". */
  setLabel: string;
  /** Zieldauer der Uebung in Sekunden; 0 = reine Stoppuhr. */
  target: number;
  /** Bereits eingetragener Wert des Satzes - die Uhr zaehlt darauf weiter. */
  baseValue: number;
  audioPrefs: AudioPrefs;
  /** Beenden mit dem erreichten Wert in Sekunden. */
  onEnd: (seconds: number) => void;
}): React.ReactElement {
  const startRef = useRef<number>(Date.now());
  const [tick, setTick] = useState<DurTick>(() => durTick(startRef.current, startRef.current, target));
  const [ringSize, setRingSize] = useState<number>(() =>
    ringSizeFor(window.innerWidth, window.innerHeight),
  );
  const valueRef = useRef<number>(baseValue);
  const endedRef = useRef(false);

  useScrollLock(true);

  const end = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd(valueRef.current);
  }, [onEnd]);

  // Takt und Signale. Laeuft genau einmal; target/baseValue/audioPrefs werden
  // beim Start eingefroren (wie bisher in der Zelle).
  useEffect(() => {
    const start = startRef.current;
    ensureAudio();
    let lastLead = -1;
    let lastElapsed = -1;
    let lastRounds = 0;
    let leadDone = false;

    const id = window.setInterval(() => {
      const now = Date.now();
      const raw = durTick(start, now, target);
      // Nach der Vorbereitung zaehlt die Uhr auf einem schon vorhandenen Wert
      // weiter: dafuer die Jetzt-Zeit um genau diesen Vorsprung verschieben,
      // damit Zahl, Ring und Runden dieselbe Gesamtzeit meinen.
      const t =
        raw.phase === "lead" ? raw : durTick(start, now + baseValue * 1000, target);
      setTick(t);

      if (t.phase === "lead") {
        if (t.leadLeft !== lastLead) {
          lastLead = t.leadLeft;
          clickTick(true, audioPrefs);
        }
        return;
      }

      if (!leadDone) {
        leadDone = true;
        playBeep(audioPrefs);
        buzz(audioPrefs);
        lastElapsed = t.elapsed;
        lastRounds = t.rounds;
        valueRef.current = t.elapsed;
        return;
      }

      valueRef.current = t.elapsed;

      if (t.rounds > lastRounds) {
        // Zielzeit voll (erste Runde) oder eine weitere Extra-Runde geschafft.
        lastRounds = t.rounds;
        lastElapsed = t.elapsed;
        playGoal(audioPrefs);
        buzzGoal(audioPrefs);
        return;
      }
      if (t.reached && t.elapsed > lastElapsed) {
        lastElapsed = t.elapsed;
        goalTick(audioPrefs);
        return;
      }
      lastElapsed = t.elapsed;
    }, 100);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onResize(): void {
      setRingSize(ringSizeFor(window.innerWidth, window.innerHeight));
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") end();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [end]);

  const isLead = tick.phase === "lead";
  const flash = tick.flash;

  const caption = isLead
    ? "Fertig machen"
    : flash
      ? tick.mult > 0
        ? "×" + tick.mult + " geschafft"
        : "Geschafft"
      : target > 0
        ? tick.reached
          ? "Ziel " + target + " s geschafft"
          : "Ziel " + target + " s"
        : "läuft";

  const ringFrac = flash ? 1 : tick.frac;
  const ringClass = flash
    ? "stroke-white"
    : isLead
      ? "stroke-white/50"
      : tick.reached
        ? "stroke-primary-soft"
        : "stroke-primary";

  return createPortal(
    <div
      className="fixed inset-0 z-[94] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-label={"Timer " + exerciseName}
      onClick={end}
    >
      <div
        className={
          "flex h-[54vh] max-h-[560px] min-h-[360px] w-full max-w-[430px] flex-col items-center justify-between rounded-[28px] px-6 py-6 text-timer-surface-foreground shadow-pop transition-colors duration-200 " +
          (flash ? "bg-primary" : "bg-timer-surface")
        }
      >
        <div className="w-full text-center">
          <div className="truncate text-[17px] font-bold">{exerciseName}</div>
          <div className="mt-0.5 text-[12px] font-semibold uppercase tracking-wide text-white/70">
            {setLabel}
          </div>
        </div>

        <ProgressRing
          frac={ringFrac}
          size={ringSize}
          stroke={RING_STROKE}
          className={ringClass}
          trackClassName={flash ? "stroke-white/30" : "stroke-white/15"}
        >
          <div className="font-mono text-[56px] font-bold leading-none tabular-nums">
            {isLead ? tick.leadLeft : bigValue(tick.elapsed)}
          </div>
          <div className="mt-2 max-w-[85%] truncate text-[13px] font-semibold text-white/75">
            {caption}
          </div>
          {tick.mult > 0 && !isLead && (
            <div className="mt-2 rounded-pill bg-white/15 px-2.5 py-1 font-mono text-[13px] font-bold">
              ×{tick.mult}
            </div>
          )}
        </ProgressRing>

        <div className="flex w-full flex-col items-center gap-2">
          <button
            type="button"
            className="w-full rounded-control bg-white/15 py-3 text-[15px] font-semibold text-white"
            onClick={end}
          >
            Beenden
          </button>
          <div className="text-[12px] text-white/55">
            {isLead ? LEAD_SEC + " Sekunden zum Einhängen" : "Tippen beendet"}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
