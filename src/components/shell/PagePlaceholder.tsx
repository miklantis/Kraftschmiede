import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Schlanker Platzhalter fuer Bereiche, die erst in spaeteren Phasen Inhalt
// bekommen. Haelt Titel und einen kurzen Hinweis, damit die Navigation jetzt
// schon ueberall hin fuehrt und testbar ist.
export function PagePlaceholder({
  title,
  note,
}: {
  title: string;
  note: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">In Arbeit</CardTitle>
          <CardDescription>{note}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Dieser Bereich ist über die Navigation erreichbar. Der Inhalt
            entsteht im zugehörigen Block.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
