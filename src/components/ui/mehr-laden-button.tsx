import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Einheitlicher „Mehr laden"-Knopf unter einer schrittweise sichtbaren Liste.
// Rendert nichts, wenn nichts mehr zu zeigen ist – so bleibt der Aufrufer frei
// von Bedingungen. Zusammen mit dem Hook useMehrLaden.
export function MehrLadenButton({
  hatMehr,
  onMehrLaden,
  className,
}: {
  hatMehr: boolean;
  onMehrLaden: () => void;
  className?: string;
}): React.ReactElement | null {
  if (!hatMehr) return null;
  return (
    <Button
      variant="outline"
      className={cn("mt-1 w-full", className)}
      onClick={onMehrLaden}
    >
      Mehr laden
    </Button>
  );
}
