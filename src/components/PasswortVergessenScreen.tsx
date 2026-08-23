import { useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/AuthCard";

// "Passwort vergessen": E-Mail eingeben, Link anfordern. Erreichbar ueber den
// Verweis auf dem Anmelde-Bildschirm, der auch den Zurueck-Weg stellt.
//
// Zwei Dinge sind hier Absicht:
//  - Die Bestaetigung verraet nicht, ob es zu der Adresse ein Konto gibt.
//  - Nach dem Absenden verschwindet das Formular. Der Mail-Versand ist eng
//    gedeckelt; wer mehrfach anfordert, sperrt sich selbst aus (Issue #349).
export function PasswortVergessenScreen({
  startEmail,
  onZurueck,
}: {
  startEmail: string;
  onZurueck: () => void;
}): ReactElement {
  const { passwortVergessen } = useAuth();
  const [email, setEmail] = useState<string>(startEmail);
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [gesendet, setGesendet] = useState<boolean>(false);

  async function absenden(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFehler(null);
    if (email.trim() === "") {
      setFehler("Bitte E-Mail eingeben.");
      return;
    }
    setBusy(true);
    const ergebnis = await passwortVergessen(email.trim());
    setBusy(false);
    if (!ergebnis.ok) {
      setFehler(ergebnis.message);
      return;
    }
    setGesendet(true);
  }

  if (gesendet) {
    return (
      <AuthCard subtitle="Die Mail ist unterwegs.">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Wenn es zu dieser Adresse ein Konto gibt, liegt gleich eine Mail mit
            einem Link zum Zurücksetzen im Postfach. Schau auch im Spam-Ordner
            nach.
          </p>
          <p className="text-muted-foreground text-sm">
            Der Versand kann ein paar Minuten dauern. Fordere den Link bitte nur
            einmal an – zu viele Anfragen sperren den Versand vorübergehend.
          </p>
          <Button variant="outline" className="w-full" onClick={onZurueck}>
            Zurück zur Anmeldung
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard subtitle="Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst.">
      <form className="space-y-4" onSubmit={(e) => void absenden(e)}>
        <div className="space-y-2">
          <label htmlFor="reset-email" className="text-sm font-medium">
            E-Mail
          </label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </div>

        {fehler !== null ? (
          <p className="text-danger text-sm" role="alert">
            {fehler}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Bitte warten ..." : "Link anfordern"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onZurueck}
          disabled={busy}
        >
          Zurück zur Anmeldung
        </Button>
      </form>
    </AuthCard>
  );
}
