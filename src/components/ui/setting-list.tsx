import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Gruppierte Listen wie in den iOS-Einstellungen, domaenenfrei.
//
// SettingsGroup ist der weisse, abgerundete Kasten (Karten-Optik aus dem Klar-
// Theme); die Reihen darin sind durch feine Trennlinien getrennt. SettingRow ist
// eine einzelne Reihe: Beschriftung links, Steuerelement rechts. Mit onClick wird
// die ganze Reihe tippbar (z. B. zum Aufklappen). Optional eine kleine graue
// Erklaerzeile (description) unter dem Label. Mindesthoehe 44px wie auf dem
// iPhone. Genutzt fuer Engine/Einheiten, Pausen-Timer, Inventar und mehr.
export function SettingsGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-card bg-card shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingRow({
  label,
  description,
  children,
  onClick,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}): React.ReactElement {
  const inner = (
    <>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-foreground">{label}</span>
        {description != null && (
          <span className="mt-0.5 text-[13px] leading-[1.4] text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {children != null && <span className="flex-none">{children}</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5",
        className,
      )}
    >
      {inner}
    </div>
  );
}
