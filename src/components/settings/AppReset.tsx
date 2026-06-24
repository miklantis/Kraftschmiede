import { useState, type ReactElement } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import { resetServiceWorker } from "@/lib/pwaUpdate";

// Notbremse: leert die gespeicherte App-Huelle (Service Worker + zwischen-
// gespeicherte App-Dateien) und laedt die App frisch aus dem Netz. Fuer den
// seltenen Fall, dass ein Update nicht ankommt und die App auf einem alten
// Stand haengt. Die Trainingsdaten liegen getrennt und bleiben unberuehrt.
export function AppReset(): ReactElement {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset(): Promise<void> {
    setBusy(true);
    await resetServiceWorker(); // leert die Huelle und laedt am Ende neu
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">App zurücksetzen</h2>
      <p className="text-muted-foreground text-xs">
        Leert die gespeicherten App-Dateien und lädt die App frisch aus dem Netz.
        Hilft, falls ein Update nicht ankommt und die App auf einem alten Stand
        hängt. Deine Daten bleiben dabei erhalten.
      </p>

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <RotateCcw />
          App zurücksetzen
        </Button>
      </div>

      <Overlay
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        title="App zurücksetzen?"
      >
        <div className="space-y-4">
          <p className="text-foreground text-sm">
            Die gespeicherten App-Dateien werden geleert und die App lädt einmal
            neu. Deine Daten (Einheiten, Übungen, Einstellungen) bleiben
            erhalten. Du solltest dafür online sein.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={busy}
            >
              Abbrechen
            </Button>
            <Button size="sm" onClick={() => void reset()} disabled={busy}>
              {busy ? "Setze zurück …" : "Zurücksetzen"}
            </Button>
          </div>
        </div>
      </Overlay>
    </section>
  );
}
