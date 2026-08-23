import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/AuthCard";

// Bildschirm zum Passwort-Vergeben. Erscheint, wenn die App ueber einen Link
// von Supabase geoeffnet wurde - aus zwei Anlaessen, die sich nur im Text
// unterscheiden:
//  - "einladung": neues Konto aktivieren.
//  - "wiederherstellung": Passwort war vergessen, ein neues wird gesetzt.
// Die E-Mail steht in beiden Faellen schon fest (aus dem Link) und wird nur
// angezeigt - das ist der "E-Mail-Check": nur wer den Link aus der Mail hat,
// landet hier. Das Passwort wird zweimal eingegeben.
const TEXTE = {
  einladung: {
    subtitle: "Lege ein Passwort fest, um dein Konto zu aktivieren.",
    aktion: "Konto aktivieren",
  },
  wiederherstellung: {
    subtitle: "Lege ein neues Passwort für dein Konto fest.",
    aktion: "Passwort speichern",
  },
} as const;

export function PasswortSetzenScreen(): ReactElement {
  const { passwortAnlass, passwortEmail, setPassword } = useAuth();
  const [passwort, setPasswort] = useState<string>("");
  const [wiederholung, setWiederholung] = useState<string>("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const texte = TEXTE[passwortAnlass ?? "einladung"];

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
    // Bei Erfolg verlaesst der AuthProvider den Passwort-Modus und der
    // AuthGate laesst die App durch.
  }

  return (
    <AuthCard subtitle={texte.subtitle}>
      <form className="space-y-4" onSubmit={(e) => void absenden(e)}>
        {passwortEmail !== null ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">E-Mail</label>
            <p className="text-muted-foreground bg-input rounded-control px-3 py-2 text-sm">
              {passwortEmail}
            </p>
          </div>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="passwort" className="text-sm font-medium">
            Passwort
          </label>
          <Input
            id="passwort"
            type="password"
            autoComplete="new-password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="wiederholung" className="text-sm font-medium">
            Passwort wiederholen
          </label>
          <Input
            id="wiederholung"
            type="password"
            autoComplete="new-password"
            value={wiederholung}
            onChange={(e) => setWiederholung(e.target.value)}
            disabled={busy}
          />
        </div>

        {fehler !== null ? (
          <p className="text-danger text-sm" role="alert">
            {fehler}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Bitte warten ..." : texte.aktion}
        </Button>
      </form>
    </AuthCard>
  );
}
