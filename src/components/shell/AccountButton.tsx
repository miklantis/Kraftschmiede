import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Konto-Zugang als wiederverwendbares Element. Fuehrt zur Einstellungen-Seite
// (dort sitzt das Konto-/Sync-Panel). Zwei Auspraegungen:
//  - "full": Avatar + Name + Sync-Status (Sidebar-Fuss, Desktop)
//  - "compact": nur runder Avatar (Mobile-Kopf)
export function AccountButton({
  variant = "full",
}: {
  variant?: "full" | "compact";
}): React.ReactElement {
  const { session } = useAuth();
  const email = session?.user.email ?? "";
  const initial = (email.charAt(0) || "K").toUpperCase();
  const angemeldet = Boolean(session);

  const avatar = (
    <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
      {initial}
    </span>
  );

  if (variant === "compact") {
    return (
      <Link
        to="/einstellungen"
        aria-label="Konto und Einstellungen"
        className="focus-visible:ring-ring/30 rounded-full outline-none focus-visible:ring-3"
      >
        {avatar}
      </Link>
    );
  }

  return (
    <Link
      to="/einstellungen"
      className={cn(
        "hover:bg-sidebar-accent flex items-center gap-3 rounded-3xl p-2 text-left transition-colors",
        "focus-visible:ring-ring/30 outline-none focus-visible:ring-3",
      )}
    >
      {avatar}
      <span className="flex min-w-0 flex-col">
        <span className="text-sidebar-foreground truncate text-sm font-medium">
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
