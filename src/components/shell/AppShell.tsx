import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

// Durchgaengige Huelle aller Seiten. Umschaltpunkt 960px (wie V1):
//  - ab 960px: feste Sidebar links, Inhalt mit linkem Abstand
//  - darunter: schlanker Kopf oben, Bottom-Nav unten fixiert
// Der wechselnde Seiteninhalt kommt als children (das Router-Outlet).
export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-dvh">
      {/* Desktop-Sidebar: erst ab 960px sichtbar */}
      <div className="hidden min-[960px]:block">
        <Sidebar />
      </div>

      <div className="min-[960px]:ml-[264px]">
        {/* Mobile-Kopf: nur unter 960px */}
        <div className="min-[960px]:hidden">
          <MobileHeader />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 pt-2 pb-28 min-[960px]:px-8 min-[960px]:py-8">
          {children}
        </main>
      </div>

      {/* Bottom-Nav: nur unter 960px */}
      <div className="min-[960px]:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
