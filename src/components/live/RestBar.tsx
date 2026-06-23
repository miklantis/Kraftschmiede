import { useEffect, useRef, useState } from "react";
import { buzz, playBeep } from "@/lib/liveAudio";
import { fmtDur } from "@/lib/liveSession";

// Pausen-Leiste der laufenden Einheit (Phase 11, Lieferung 3). Schwebt unten:
// Desktop zentriert (~460px), Mobile von Rand zu Rand ueber der Navigation.
// 1:1 wie V1 (live.js kl-restbar / restTick): Countdown ab `endsAt`, -15/+15,
// Skip; laeuft sie ab, kommt einmalig Piep + Vibration und die Leiste wird gruen.
//
// Der Tick laeuft lokal (500ms) ueber einen kleinen Zustand - so bleibt das
// Live-Panel davon unberuehrt. `endsAt` (absolute Endzeit) kommt aus dem Store;
// aendert es sich (+/-15), wird das einmalige Signal wieder scharf gestellt.

export function RestBar({
  endsAt,
  audioPrefs,
  isDesktop,
  onAdjust,
  onSkip,
}: {
  endsAt: number;
  audioPrefs: { sound: boolean; vibrate: boolean };
  isDesktop: boolean;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}): React.ReactElement {
  const [now, setNow] = useState<number>(() => Date.now());
  const fired = useRef(false);

  // Neue/verlaengerte Pause: Signal wieder scharf stellen, solange Zeit bleibt.
  useEffect(() => {
    if (endsAt - Date.now() > 0) fired.current = false;
  }, [endsAt]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const remain = Math.round((endsAt - now) / 1000);
  const done = remain <= 0;

  // Signal genau einmal beim Nulldurchgang (nicht bei spaeterem Re-Render).
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      if (remain > -3) {
        playBeep(audioPrefs);
        buzz(audioPrefs);
      }
    }
  }, [done, remain, audioPrefs]);

  return (
    <div className={"kl-restbar" + (done ? " is-done" : "")} data-desk={isDesktop ? "" : undefined}>
      <button type="button" className="kl-restbar-btn" onClick={() => onAdjust(-15)}>
        −15
      </button>
      <div className="kl-restbar-mid">
        <div className="kl-restbar-lab">Pause</div>
        <div className="kl-restbar-time">{fmtDur(Math.max(0, remain))}</div>
      </div>
      <button type="button" className="kl-restbar-btn" onClick={() => onAdjust(15)}>
        +15
      </button>
      <button type="button" className="kl-restbar-skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
