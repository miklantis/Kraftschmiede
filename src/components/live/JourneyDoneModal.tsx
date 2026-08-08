import { useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import {
  clearJourneyDone,
  getJourneyDone,
  subscribeJourneyDone,
} from "@/lib/journeyDone";

// Meldung nach der Einheit, die die letzte Journey-Woche vollmacht: die Journey
// ist durchlaufen und archiviert. Von hier fuehren zwei Wege - direkt in die
// naechste Journey oder bewusst ins freie Training. Sitzt in der global
// gemounteten Live-Schicht, weil das Ende-Popup beim Speichern verschwindet.
export function JourneyDoneModal(): React.ReactElement {
  const navigate = useNavigate();
  const name = useSyncExternalStore(
    subscribeJourneyDone,
    getJourneyDone,
    getJourneyDone,
  );

  function close(): void {
    clearJourneyDone();
  }

  function toChooser(): void {
    clearJourneyDone();
    void navigate({ to: "/journey/waehlen" });
  }

  return (
    <Overlay open={name !== null} onClose={close} title="Journey abgeschlossen">
      <div className="mb-4 rounded-[14px] bg-card p-4 shadow-card">
        <div className="text-[15px] font-semibold text-foreground">
          {name ?? ""}
        </div>
        <div className="mt-1.5 text-[14px] leading-[1.55] text-muted-foreground">
          Die letzte geplante Woche ist voll – die Journey ist durchlaufen und
          liegt jetzt im Archiv. Du kannst direkt die nächste starten oder erst
          einmal frei weitertrainieren.
        </div>
      </div>
      <Button
        onClick={toChooser}
        className="h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
      >
        Neue Journey wählen
      </Button>
      <Button
        variant="secondary"
        onClick={close}
        className="mt-2 h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
      >
        Erst frei trainieren
      </Button>
    </Overlay>
  );
}
