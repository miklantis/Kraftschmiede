import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/AuthCard";

// Einladungs-Screen: erscheint, wenn die App ueber einen Einladungslink von
// Supabase geoeffnet wurde. Die E-Mail steht bereits fest (aus der Einladung)
// und wird nur angezeigt – das ist der "E-Mail-Check": nur wer den Link aus
// der eingeladenen Mail hat, landet hier. Der Nutzer vergibt sein Passwort
// (zweimal zur Sicherheit) und ist danach direkt angemeldet.
export function InviteScreen(): ReactElement {
  const { inviteEmail, setPassword } = useAuth();
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
    // Bei Erfolg verlaesst der AuthProvider den Einladungs-Modus und der
    // AuthGate laesst die App durch.
  }

  return (
    <AuthCard subtitle="Lege ein Passwort fest, um dein Konto zu aktivieren.">
      <form className="space-y-4" onSubmit={(e) => void absenden(e)}>
        {inviteEmail !== null ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">E-Mail</label>
            <p className="text-muted-foreground bg-input rounded-control px-3 py-2 text-sm">
              {inviteEmail}
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
          {busy ? "Bitte warten ..." : "Konto aktivieren"}
        </Button>
      </form>
    </AuthCard>
  );
}
