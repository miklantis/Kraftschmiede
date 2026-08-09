import type { ReactElement, ReactNode } from "react";

import { BrandMark } from "@/components/shell/BrandMark";

// Gemeinsamer Rahmen fuer alle Auth-Screens (Anmelden, Einladung annehmen):
// Marken-Lockup (gruenes Kaestchen mit BrandMark plus versaler Schriftzug wie
// in der Sidebar) ueber einer weissen Karte auf der grauen Canvas. Inhalt
// (Felder, Knoepfe) kommt je Screen als children herein; nur der Untertitel
// wird als Prop gereicht, damit das Lockup identisch bleibt und Layout-
// Aenderungen an genau einer Stelle passieren.
export function AuthCard({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}): ReactElement {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="bg-card rounded-card w-full max-w-sm p-7 shadow-auth sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground rounded-control flex size-11 items-center justify-center">
            <BrandMark size={26} />
          </span>
          <span className="text-[15px] font-bold tracking-[1px] text-foreground-secondary uppercase">
            Kraftschmiede
          </span>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
