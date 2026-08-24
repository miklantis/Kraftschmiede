import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { supabaseConfig } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/hooks/useSettings";
import { useUpdateSettings } from "@/hooks/useUpdateSettings";
import { avatarAusDatei } from "@/lib/profilbild";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PasswortAendern } from "@/components/settings/PasswortAendern";

// Konto-/Sync-Panel oben auf der Einstellungen-Seite. Zeigt Avatar, "Mein Konto",
// angemeldete E-Mail und den Verbindungsstatus zur Datenbank; rechts der Status,
// darunter neu pruefen und abmelden. Der Verbindungstest ruft den Health-Endpoint
// des Supabase-Projekts auf (wie in der bisherigen Einstellungen-Seite).
// "Passwort aendern" klappt darunter ein Formular auf - das ist der einzige
// Weg zum Passwort im angemeldeten Zustand (Issue #349).
// Hier sitzt auch die einzige Stelle, an der das Profilbild gesetzt oder
// entfernt wird (Issue #370): der Kreis selbst und der Knopf daneben oeffnen
// den Dateiwaehler, zugeschnitten und verkleinert wird in lib/profilbild.ts.
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
  const settings = useSettings();
  const { update } = useUpdateSettings();
  const [passwortOffen, setPasswortOffen] = useState<boolean>(false);
  const [passwortGeaendert, setPasswortGeaendert] = useState<boolean>(false);
  const [bildLaeuft, setBildLaeuft] = useState<boolean>(false);
  const [bildFehler, setBildFehler] = useState<string | null>(null);
  const dateiRef = useRef<HTMLInputElement>(null);
  const email = session?.user.email ?? "unbekannt";
  const initial = (email.charAt(0) || "K").toUpperCase();
  const bild = settings.data?.avatar ?? "";
  const hatBild = bild.length > 0;

  const connection = useQuery({
    queryKey: queryKeys.verbindung(),
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

  // Datei waehlen -> zuschneiden/verkleinern -> in die Einstellungen schreiben.
  // Der Dateiwaehler wird danach geleert, sonst loest dieselbe Datei beim
  // zweiten Mal kein Ereignis aus.
  async function bildUebernehmen(datei: File | undefined): Promise<void> {
    if (datei === undefined) return;
    setBildFehler(null);
    setBildLaeuft(true);
    try {
      await update({ avatar: await avatarAusDatei(datei) });
    } catch (fehler) {
      setBildFehler(
        fehler instanceof Error
          ? fehler.message
          : "Das Bild konnte nicht gespeichert werden.",
      );
    } finally {
      setBildLaeuft(false);
    }
  }

  async function bildEntfernen(): Promise<void> {
    setBildFehler(null);
    setBildLaeuft(true);
    try {
      await update({ avatar: "" });
    } catch {
      setBildFehler("Das Bild konnte nicht entfernt werden.");
    } finally {
      setBildLaeuft(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => dateiRef.current?.click()}
          disabled={bildLaeuft}
          aria-label={hatBild ? "Profilbild ändern" : "Profilbild wählen"}
          className="focus-visible:ring-ring/30 relative flex-none rounded-full outline-none focus-visible:ring-3 disabled:opacity-60"
        >
          <Avatar bild={bild} initial={initial} groesse="lg" />
          <span
            aria-hidden
            className="border-card bg-muted text-muted-foreground absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border-2"
          >
            <Camera className="size-2.5" />
          </span>
        </button>
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

      <input
        ref={dateiRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const datei = event.target.files?.[0];
          event.target.value = "";
          void bildUebernehmen(datei);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => dateiRef.current?.click()}
          disabled={bildLaeuft}
        >
          {hatBild ? "Bild ändern" : "Bild wählen"}
        </Button>
        {hatBild ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void bildEntfernen()}
            disabled={bildLaeuft}
          >
            Bild entfernen
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void connection.refetch()}
          disabled={connection.isFetching}
        >
          Verbindung neu prüfen
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPasswortGeaendert(false);
            setPasswortOffen((offen) => !offen);
          }}
        >
          Passwort ändern
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Abmelden
        </Button>
      </div>

      {bildLaeuft ? (
        <p className="text-muted-foreground text-xs" role="status">
          Bild wird übernommen …
        </p>
      ) : null}

      {bildFehler !== null && !bildLaeuft ? (
        <p className="text-danger text-xs" role="status">
          {bildFehler}
        </p>
      ) : null}

      {passwortOffen ? (
        <PasswortAendern
          onFertig={(erfolgreich) => {
            setPasswortOffen(false);
            setPasswortGeaendert(erfolgreich);
          }}
        />
      ) : null}

      {passwortGeaendert && !passwortOffen ? (
        <p className="text-good text-xs" role="status">
          Passwort geändert. Beim nächsten Anmelden gilt das neue.
        </p>
      ) : null}
    </div>
  );
}
