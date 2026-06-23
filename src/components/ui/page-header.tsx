import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AccountButton } from "@/components/shell/AccountButton";

// Seitenkopf oben auf jeder Feature-Seite: kleine Datumszeile plus grosser Titel.
// Optik 1:1 aus V1 (ks-screen-head, mobile-first): Titel am Handy 28px, am Desktop
// 34px; Datum 13/14px. Am Handy sitzt rechts der Konto-Avatar (zum Kopf zentriert,
// mit Sync-Punkt) - wie V1; am Desktop liegt das Konto in der Sidebar, daher hier
// kein Avatar. Der untere Abstand gehoert zum Kopf (Handy 16, Desktop 26px).
export function PageHeader({
  title,
  date,
  hideAccount = false,
  className,
}: {
  title: ReactNode;
  date?: ReactNode;
  // Mobiles Konto-Icon oben rechts ausblenden. Sinnvoll auf der Einstellungen-
  // Seite selbst, wo das Konto bereits ein eigener Abschnitt ist.
  hideAccount?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <header
      className={cn(
        "mb-4 flex items-center justify-between gap-3 pt-1.5 min-[960px]:mb-[26px] min-[960px]:block min-[960px]:pt-0",
        className,
      )}
    >
      <div className="min-w-0">
        {date != null && (
          <div className="text-[13px] font-medium text-muted-foreground min-[960px]:text-[14px]">
            {date}
          </div>
        )}
        <h1 className="mt-px text-[28px] font-bold tracking-[-0.4px] text-foreground min-[960px]:mt-1 min-[960px]:text-[34px] min-[960px]:tracking-[-0.5px]">
          {title}
        </h1>
      </div>
      {!hideAccount && (
        <div className="flex-none min-[960px]:hidden">
          <AccountButton variant="compact" />
        </div>
      )}
    </header>
  );
}
