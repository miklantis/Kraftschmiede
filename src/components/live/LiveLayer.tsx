import { useEffect } from "react";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useSettings } from "@/hooks/useSettings";
import { useWakeLock } from "@/hooks/useWakeLock";
import { LivePanel } from "./LivePanel";
import { StartModal } from "./StartModal";
import { EndModal } from "./EndModal";

// Global gemountete Live-Schicht (in der App-Huelle). Buendelt das Panel und die
// beiden Dialoge und schaltet zwei Body-Klassen, an denen die App-Huelle haengt:
//   - ks-live-expanded: aufgeklapptes Panel -> mobile Navigation weicht
//   - ks-live-collapsed: Mini-Streifen -> Seiteninhalt bekommt Fuss-Abstand
export function LiveLayer(): React.ReactElement {
  const live = useLiveSession();
  const active = live.session != null;
  const collapsed = live.collapsed;

  // Bildschirm wachhalten, solange eine Einheit laeuft - aber nur, wenn der
  // Schalter in den Einstellungen an ist (Standard aus) und das Geraet die API
  // kennt. Der Hook fordert den Lock an/gibt ihn frei und holt ihn nach einem
  // App-Wechsel automatisch zurueck.
  const settingsQ = useSettings();
  const wakeWanted = settingsQ.data?.timers?.wakeLock === true;
  useWakeLock(active && wakeWanted);

  useEffect(() => {
    const b = document.body;
    b.classList.toggle("ks-live-expanded", active && !collapsed);
    b.classList.toggle("ks-live-collapsed", active && collapsed);
    return () => {
      b.classList.remove("ks-live-expanded");
      b.classList.remove("ks-live-collapsed");
    };
  }, [active, collapsed]);

  return (
    <>
      <LivePanel />
      <StartModal />
      <EndModal />
    </>
  );
}
