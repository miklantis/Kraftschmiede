// Ruhepausen der laufenden Einheit (Vorhaben #55, Schritt 2) - die reine
// Rechnung. Keine React-/DOM-Abhaengigkeit: die Zeit kommt als Parameter `now`
// herein statt ueber Date.now(), damit die Rechnung ohne Uhr pruefbar bleibt.
// Der Store haelt die laufende Pause; der Countdown selbst tickt in der
// Pausen-Leiste (RestBar) lokal ab der absoluten Endzeit.

/**
 * Laufende Pause. Fluechtig, NICHT persistiert: ein Reload mitten in der Pause
 * laesst sie fallen - der Stand der Saetze bleibt aber erhalten. `endsAt` ist
 * die absolute Endzeit (ms); die Pausen-Leiste rechnet daraus den Countdown und
 * feuert das Signal beim Nulldurchgang. `baseSec` haelt den Ausgangswert fest,
 * an dem der Fortschrittsbalken sich misst.
 */
export interface RestState {
  type: "set" | "exercise";
  endsAt: number;
  baseSec: number;
}

/** Neue Pause. Null (= keine Pause) bei nicht positiver Dauer. */
export function startedRest(
  type: RestState["type"],
  sec: number,
  now: number,
): RestState | null {
  if (sec <= 0) return null;
  return { type, endsAt: now + sec * 1000, baseSec: sec };
}

/**
 * Pause verlaengern oder verkuerzen. Eine bereits abgelaufene Pause rechnet ab
 * jetzt, nicht ab der alten Endzeit; Verkuerzen klemmt nie unter jetzt.
 */
export function adjustedRest(rest: RestState, delta: number, now: number): RestState {
  const endsAt = Math.max(now, rest.endsAt) + delta * 1000;
  return { ...rest, endsAt: Math.max(now, endsAt) };
}
