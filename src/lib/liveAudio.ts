// Toene und Vibration der Live-Session - 1:1 aus V1 (live.js: ensureAudio /
// playBeep / buzz / clickTick). Bewusst ein duenner Effekt-Baustein:
//   - ein einziger, lazy erzeugter AudioContext (erst bei erster Nutzer-Geste,
//     sonst blockt der Browser die Wiedergabe)
//   - alle Ausgaben folgen den Schaltern aus den Einstellungen (Ton/Vibration)
//   - iOS Safari kennt navigator.vibrate nicht -> Aufrufe sind dort No-ops
//
// Kein React, kein DOM-Bezug. Die Schalter kommen je Aufruf herein, damit das
// Modul zustandsarm bleibt (nur der AudioContext ist Modul-intern gecacht).

export interface AudioPrefs {
  sound: boolean;
  vibrate: boolean;
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let audioCtx: AudioContext | null = null;

/** AudioContext bei Bedarf anlegen und (falls angehalten) fortsetzen. */
export function ensureAudio(): void {
  try {
    if (!audioCtx) {
      const w = window as WindowWithWebkitAudio;
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
  } catch {
    // Audio nicht verfuegbar - still ignorieren, die Session laeuft weiter.
  }
}

/** Doppelter, heller Piepton am Ende einer Pause. */
export function playBeep(prefs: AudioPrefs): void {
  if (!prefs.sound) return;
  try {
    ensureAudio();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    for (const off of [0, 0.2]) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t0 + off);
      g.gain.setValueAtTime(0.0001, t0 + off);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.16);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t0 + off);
      o.stop(t0 + off + 0.18);
    }
  } catch {
    // ignorieren
  }
}

/** Vibrationsmuster am Ende einer Pause (nur dort, wo unterstuetzt). */
export function buzz(prefs: AudioPrefs): void {
  if (!prefs.vibrate) return;
  try {
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  } catch {
    // ignorieren
  }
}

/**
 * Kurzer UI-Klick beim Umschalten eines Erledigt-Hakens. "An" klingt heller/
 * aufsteigend, "Aus" tiefer/abfallend; dazu eine sehr kurze Vibration (Android).
 */
export function clickTick(on: boolean, prefs: AudioPrefs): void {
  if (prefs.sound) {
    try {
      ensureAudio();
      if (audioCtx) {
        const t0 = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const f = on ? 540 : 400;
        o.type = "triangle";
        o.frequency.setValueAtTime(f, t0);
        o.frequency.exponentialRampToValueAtTime(on ? f * 1.7 : f * 0.6, t0 + 0.05);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t0);
        o.stop(t0 + 0.1);
      }
    } catch {
      // ignorieren
    }
  }
  if (prefs.vibrate) {
    try {
      if (navigator.vibrate) navigator.vibrate(on ? 18 : 11);
    } catch {
      // ignorieren
    }
  }
}
