import type { ReactElement, ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LoginScreen } from "@/components/LoginScreen";
import { InviteScreen } from "@/components/InviteScreen";
import { AuthCard } from "@/components/auth/AuthCard";

// Tor vor der App: erst Sitzungsstatus klaeren, dann den passenden Screen
// zeigen. Reihenfolge ist wichtig:
//  1. Laden -> Platzhalter.
//  2. Check gescheitert -> "Anmeldung nicht erreichbar" mit Neuversuch.
//  3. Einladungs-Modus -> "Passwort festlegen" (auch wenn schon eine Sitzung
//     besteht, denn der Eingeladene hat noch kein eigenes Passwort vergeben).
//  4. Keine Sitzung -> Login.
//  5. Angemeldet -> App.
// Schreibzugriffe brauchen eine angemeldete Sitzung (RLS), daher sitzt das Tor
// vor dem Router.
export function AuthGate({ children }: { children: ReactNode }): ReactElement {
  const { session, loading, authFehler, erneutPruefen, invitePending } =
    useAuth();

  if (loading) {
    return (
      <main className="text-muted-foreground flex min-h-dvh items-center justify-center p-6">
        Laden ...
      </main>
    );
  }

  // Der Anmelde-Check ist gescheitert oder hat das Zeitlimit gerissen. Statt
  // stumm weiter "Laden ..." zu zeigen (Issue #348): sagen, was los ist, den
  // Fehlertext nennen und einen Weg heraus anbieten.
  if (authFehler !== null) {
    return (
      <AuthCard subtitle="Die Anmeldung ist gerade nicht erreichbar.">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Die App konnte nicht prüfen, ob du angemeldet bist. Meist liegt das
            an der Verbindung. Versuch es gleich noch einmal – hilft das nicht,
            probier es später erneut.
          </p>
          <p
            className="text-danger rounded-control bg-danger/10 px-3 py-2 text-xs"
            role="alert"
          >
            {authFehler}
          </p>
          <Button className="w-full" onClick={erneutPruefen}>
            Erneut versuchen
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (invitePending) {
    return <InviteScreen />;
  }

  if (session === null) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
