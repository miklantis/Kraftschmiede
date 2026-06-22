import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Datenstand } from "@/components/Datenstand";
import { V1Import } from "@/components/V1Import";

export const Route = createFileRoute("/einstellungen")({
  component: EinstellungenPage,
});

// Echter Verbindungstest: ruft den Health-Endpoint des Supabase-Projekts auf.
async function checkConnection(): Promise<boolean> {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/health`, {
    headers: { apikey: supabaseConfig.publishableKey },
  });
  if (!response.ok) {
    throw new Error(`Health-Check fehlgeschlagen (Status ${response.status}).`);
  }
  return true;
}

// Vorlaeufige Einstellungen-Seite: haelt vorerst Konto, Darstellung, Verbindungs-
// Diagnose, Datenstand und den V1-Import. Das vollstaendige Panel (Inventar,
// Plate-Loader, Settings, Sync) entsteht in Phase 10, Import/Export-Politur in
// Phase 12.
function EinstellungenPage(): React.ReactElement {
  const { session, signOut } = useAuth();
  const connection = useQuery({
    queryKey: ["verbindung"],
    queryFn: checkConnection,
    retry: 1,
  });

  let status: string;
  if (connection.isPending) {
    status = "Pruefe Verbindung zur Datenbank ...";
  } else if (connection.isSuccess) {
    status = "Verbindung zur Datenbank steht.";
  } else {
    status = "Verbindung zur Datenbank fehlgeschlagen.";
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konto</CardTitle>
          <CardDescription>
            Angemeldet als {session?.user.email ?? "unbekannt"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Darstellung:</span>
            <ThemeToggle />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground text-sm">{status}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void connection.refetch()}
              disabled={connection.isFetching}
            >
              Verbindung neu pruefen
            </Button>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Abmelden
            </Button>
          </div>
        </CardContent>
      </Card>

      <Datenstand />
      <V1Import />
    </div>
  );
}
