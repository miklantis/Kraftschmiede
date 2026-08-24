import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/hooks/useSettings";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Konto-Zugang als wiederverwendbares Element. Fuehrt zur Einstellungen-Seite
// (dort sitzt das Konto-/Sync-Panel). Zwei Auspraegungen:
//  - "full": Avatar + Name + Sync-Status (Sidebar-Fuss, Desktop)
//  - "compact": nur runder Avatar (Mobile-Kopf)
// Im Kreis steht das Profilbild, solange eines hinterlegt ist, sonst der
// Anfangsbuchstabe der E-Mail (Baustein Avatar).
export function AccountButton({
  variant = "full",
}: {
  variant?: "full" | "compact";
}): React.ReactElement {
  const { session } = useAuth();
  const settings = useSettings();
  const email = session?.user.email ?? "";
  const initial = (email.charAt(0) || "K").toUpperCase();
  const bild = settings.data?.avatar ?? "";
  const angemeldet = Boolean(session);

  if (variant === "compact") {
    return (
      <Link
        to="/einstellungen"
        aria-label="Konto und Einstellungen"
        className="focus-visible:ring-ring/30 relative inline-flex rounded-full outline-none focus-visible:ring-3"
      >
        <Avatar bild={bild} initial={initial} groesse="md" />
        <span
          aria-hidden
          className={cn(
            "border-card absolute -right-px -bottom-px size-3 rounded-full border-2",
            angemeldet ? "bg-primary" : "bg-muted-foreground",
          )}
        />
      </Link>
    );
  }

  return (
    <Link
      to="/einstellungen"
      className={cn(
        "hover:bg-muted flex items-center gap-3 rounded-control p-2 text-left transition-colors",
        "focus-visible:ring-ring/30 outline-none focus-visible:ring-2",
      )}
    >
      <Avatar bild={bild} initial={initial} groesse="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="text-foreground truncate text-sm font-medium">
          Mein Konto
        </span>
        <span
          className={cn(
            "truncate text-xs",
            angemeldet ? "text-good" : "text-muted-foreground",
          )}
        >
          {angemeldet ? "Synchronisiert" : "Nicht angemeldet"}
        </span>
      </span>
    </Link>
  );
}
