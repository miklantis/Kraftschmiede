import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/AuthCard";

// Reiner Anmelde-Screen im V1-"Klar"-Look. Kein Registrieren-Pfad: neue Konten
// entstehen ausschliesslich ueber eine Einladung (Supabase-Dashboard) und den
// Einladungs-Screen, daher hier bewusst kein "Konto anlegen".
export function LoginScreen(): ReactElement {
  const { signIn } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [passwort, setPasswort] = useState<string>("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  async function absenden(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFehler(null);
    if (email.trim() === "" || passwort === "") {
      setFehler("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    setBusy(true);
    const ergebnis = await signIn(email.trim(), passwort);
    setBusy(false);
    if (!ergebnis.ok) {
      setFehler(ergebnis.message);
      return;
    }
    // Bei Erfolg mit bestehender Sitzung schaltet der AuthGate automatisch um.
  }

  return (
    <AuthCard subtitle="Melde dich an, um fortzufahren.">
      <form className="space-y-4" onSubmit={(e) => void absenden(e)}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-Mail
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="passwort" className="text-sm font-medium">
            Passwort
          </label>
          <Input
            id="passwort"
            type="password"
            autoComplete="current-password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            disabled={busy}
          />
        </div>

        {fehler !== null ? (
          <p className="text-danger text-sm" role="alert">
            {fehler}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Bitte warten ..." : "Anmelden"}
        </Button>
      </form>
    </AuthCard>
  );
}
