import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Passwort im angemeldeten Zustand aendern. Sitzt im Konto-Panel der
// Einstellungen - vorher gab es den Weg nur ueber einen Einladungslink, und
// den findet niemand von selbst (Issue #349).
//
// Das Formular klappt nur bei Bedarf auf; die Karte bleibt sonst kompakt.
export function PasswortAendern({
  onFertig,
}: {
  // true = Passwort wurde gespeichert, false = abgebrochen.
  onFertig: (erfolgreich: boolean) => void;
}): ReactElement {
  const { setPassword } = useAuth();
  const [passwort, setPasswort] = useState<string>("");
  const [wiederholung, setWiederholung] = useState<string>("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  async function absenden(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFehler(null);
    if (passwort.length < 6) {
      setFehler("Das Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (passwort !== wiederholung) {
      setFehler("Die beiden Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    const ergebnis = await setPassword(passwort);
    setBusy(false);
    if (!ergebnis.ok) {
      setFehler(ergebnis.message);
      return;
    }
    setPasswort("");
    setWiederholung("");
    onFertig(true);
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-control bg-muted/50 p-3"
      onSubmit={(e) => void absenden(e)}
    >
      <div className="space-y-1.5">
        <label htmlFor="neues-passwort" className="text-xs font-medium">
          Neues Passwort
        </label>
        <Input
          id="neues-passwort"
          type="password"
          autoComplete="new-password"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="neues-passwort-wdh" className="text-xs font-medium">
          Wiederholen
        </label>
        <Input
          id="neues-passwort-wdh"
          type="password"
          autoComplete="new-password"
          value={wiederholung}
          onChange={(e) => setWiederholung(e.target.value)}
          disabled={busy}
        />
      </div>

      {fehler !== null ? (
        <p className="text-danger text-xs" role="alert">
          {fehler}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Bitte warten ..." : "Passwort speichern"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFertig(false)}
          disabled={busy}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
