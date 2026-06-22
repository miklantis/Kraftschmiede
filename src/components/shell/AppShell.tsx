import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

// Durchgaengige Huelle aller Seiten. Umschaltpunkt 960px (wie V1):
//  - ab 960px: feste Sidebar links, Inhalt mit linkem Abstand
//  - darunter: kein separater Kopf mehr - der Konto-Avatar sitzt rechts im
//    Seitenkopf (PageHeader), wie V1; unten die fixierte Bottom-Nav
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
        <main className="mx-auto w-full max-w-[1180px] px-[22px] pt-[22px] pb-28 min-[960px]:px-[52px] min-[960px]:pt-10 min-[960px]:pb-[72px]">
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
