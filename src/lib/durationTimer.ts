// Dauer-Timer der laufenden Einheit (Vorhaben #102, Schritt 1) - die reine
// Rechnung hinter der grossen Timer-Ansicht. Keine React-/DOM-Abhaengigkeit:
// Start- und Jetzt-Zeit kommen als Parameter herein, damit der Ablauf ohne Uhr
// pruefbar bleibt. Die Ansicht (DurationTimerOverlay) tickt und zeichnet nur.
//
// Ablauf einer Dauer-Uebung:
//   1) Vorbereitung: LEAD_SEC Sekunden zum Einhaengen / in Position kommen.
//   2) Zielzeit: der Ring fuellt sich einmal bis zur Zieldauer der Uebung.
//   3) Extra: der Timer laeuft weiter, der Ring fuellt sich erneut. Jede weitere
//      volle Zielzeit erhoeht den sichtbaren Multiplikator (x1, x2, x3 ...).

/** Vorbereitungszeit vor dem eigentlichen Timer (wie bisher in der Zelle). */
export const LEAD_SEC = 5;

/** Fenster nach einer vollen Runde, in dem das Erfolgssignal gezeigt wird (ms). */
export const FLASH_MS = 1200;

export type DurPhase = "lead" | "run" | "over";

export interface DurTick {
  /** "lead" = Vorbereitung, "run" = bis zur Zielzeit, "over" = Extra-Runden. */
  phase: DurPhase;
  /** Restsekunden der Vorbereitung (LEAD_SEC..1), sonst 0. */
  leadLeft: number;
  /** Volle Sekunden seit Ende der Vorbereitung - der Ergebniswert. */
  elapsed: number;
  /** Fuellgrad des Rings 0..1, millisekundengenau (fluessige Bewegung). */
  frac: number;
  /** Wie oft die Zielzeit voll durchlaufen wurde. */
  rounds: number;
  /** Sichtbarer Multiplikator der Extra-Runden: 0 = keiner, sonst x1, x2 ... */
  mult: number;
  /** Zielzeit erreicht (ab hier laeuft die Extra-Phase). */
  reached: boolean;
  /** Kurz nach einer vollen Runde: Erfolgssignal zeigen, Ring voll darstellen. */
  flash: boolean;
}

/**
 * Stand des Dauer-Timers zu einem Zeitpunkt. `target` ist die Zieldauer der
 * Uebung in Sekunden; ohne Zielzeit (0) laeuft die Uhr als reine Stoppuhr weiter,
 * ohne Ringfortschritt, Runden und Erfolgssignal.
 */
export function durTick(startMs: number, nowMs: number, target: number): DurTick {
  const sinceStart = Math.max(0, nowMs - startMs);
  const leadMs = LEAD_SEC * 1000;

  if (sinceStart < leadMs) {
    const leftMs = leadMs - sinceStart;
    return {
      phase: "lead",
      leadLeft: Math.ceil(leftMs / 1000),
      elapsed: 0,
      frac: leftMs / leadMs,
      rounds: 0,
      mult: 0,
      reached: false,
      flash: false,
    };
  }

  const runMs = sinceStart - leadMs;
  const elapsed = Math.floor(runMs / 1000);

  if (target <= 0) {
    return {
      phase: "run",
      leadLeft: 0,
      elapsed,
      frac: 0,
      rounds: 0,
      mult: 0,
      reached: false,
      flash: false,
    };
  }

  const targetMs = target * 1000;
  const rounds = Math.floor(runMs / targetMs);
  const intoRound = runMs % targetMs;
  const reached = rounds >= 1;

  return {
    phase: reached ? "over" : "run",
    leadLeft: 0,
    elapsed,
    frac: intoRound / targetMs,
    rounds,
    mult: Math.max(0, rounds - 1),
    reached,
    flash: reached && intoRound < FLASH_MS,
  };
}
