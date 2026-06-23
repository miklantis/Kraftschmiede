import { useQuery } from "@tanstack/react-query";
import { supabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Konto-/Sync-Panel oben auf der Einstellungen-Seite. Zeigt Avatar, "Mein Konto",
// angemeldete E-Mail und den Verbindungsstatus zur Datenbank; rechts der Status,
// darunter neu pruefen und abmelden. Der Verbindungstest ruft den Health-Endpoint
// des Supabase-Projekts auf (wie in der bisherigen Einstellungen-Seite).
async function checkConnection(): Promise<boolean> {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/health`, {
    headers: { apikey: supabaseConfig.publishableKey },
  });
  if (!response.ok) {
    throw new Error(`Health-Check fehlgeschlagen (Status ${response.status}).`);
  }
  return true;
}

export function AccountCard(): React.ReactElement {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? "unbekannt";
  const initial = (email.charAt(0) || "K").toUpperCase();

  const connection = useQuery({
    queryKey: ["verbindung"],
    queryFn: checkConnection,
    retry: 1,
  });

  let statusText: string;
  let statusTone: string;
  if (connection.isPending) {
    statusText = "Prüfe Verbindung …";
    statusTone = "text-muted-foreground";
  } else if (connection.isSuccess) {
    statusText = "Synchronisiert";
    statusTone = "text-good";
  } else {
    statusText = "Verbindung fehlgeschlagen";
    statusTone = "text-danger";
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {initial}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-foreground">
            Mein Konto
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {email}
          </span>
        </div>
        <span
          className={cn(
            "ml-auto flex flex-none items-center gap-1.5 text-xs font-medium",
            statusTone,
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              connection.isSuccess
                ? "bg-good"
                : connection.isError
                  ? "bg-danger"
                  : "bg-muted-foreground",
            )}
          />
          {statusText}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void connection.refetch()}
          disabled={connection.isFetching}
        >
          Verbindung neu prüfen
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Abmelden
        </Button>
      </div>
    </div>
  );
}
