import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AppShell } from "@/components/shell/AppShell";

// Grundrahmen aller Seiten. Die AppShell (Sidebar/Bottom-Nav/Kopf) umschliesst
// das Outlet, in dem die jeweilige Seite rendert.
export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout(): React.ReactElement {
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      {import.meta.env.DEV ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </>
  );
}
