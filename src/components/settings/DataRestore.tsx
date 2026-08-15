import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ChangeEvent,
} from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import { parseRestore, type RestoreResult } from "@/lib/restoreData";
import { useRestore } from "@/hooks/useRestore";

// Voll-Restore: einen eigenen V2-Export (Datei oder eingefuegter Text) einlesen,
// nach Pruefung eine Vorschau zeigen und nach Rueckfrage den kompletten Bestand
// ersetzen. Parsen/Pruefen ist rein (restoreData), das Schreiben kapselt
// useRestore. Bewusst: kein Anhaengen/Aktualisieren - nur vollstaendig ersetzen.
export function DataRestore(): ReactElement {
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { apply, isPending, done, error: applyError } = useRestore();

  function onFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file == null) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function check(): void {
    setParseError(null);
    setResult(null);
    if (text.trim() === "") {
      setParseError("Bitte eine Datei wählen oder JSON einfügen.");
      return;
    }
    try {
      const res = parseRestore(text);
      setResult(res);
      setConfirmOpen(true);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  }

  async function confirm(): Promise<void> {
    if (result == null) return;
    await apply(result.tables);
  }

  // Nach Erfolg den Dialog schliessen.
  useEffect(() => {
    if (done) setConfirmOpen(false);
  }, [done]);

  const p = result?.preview;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Wiederherstellen</h2>
      <p className="text-muted-foreground text-xs">
        Spielt einen eigenen V2-Export zurück. Achtung: ersetzt deinen kompletten
        Bestand vollständig (kein Zusammenführen). Sichere vorher per Export.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
        >
          <Upload />
          Datei wählen
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={check}
          disabled={isPending}
        >
          Prüfen
        </Button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="… oder JSON hier einfügen"
        rows={3}
        // 16px auf Mobile verhindert den Auto-Zoom von iOS Safari beim Antippen.
        className="border-border bg-card w-full rounded-md border p-2 font-mono text-[16px] min-[960px]:text-xs"
      />

      {parseError !== null ? (
        <p className="text-danger text-xs" role="alert">
          {parseError}
        </p>
      ) : null}
      {done && !isPending ? (
        <p className="text-muted-foreground text-xs">
          Bestand wiederhergestellt.
        </p>
      ) : null}

      <Overlay
        open={confirmOpen}
        onClose={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        title="Wiederherstellen?"
      >
        <div className="space-y-4">
          <div className="text-warning flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="text-foreground">
              Dein kompletter Bestand wird ersetzt. Das lässt sich nicht
              rückgängig machen.
            </span>
          </div>

          {p != null ? (
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li>{p.sessions} Einheiten</li>
              <li>{p.sets} Sätze</li>
              <li>{p.journeys} Journeys</li>
              <li>{p.exercises} Übungen</li>
            </ul>
          ) : null}

          {applyError !== null ? (
            <p className="text-danger text-xs" role="alert">
              {applyError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void confirm()}
              disabled={isPending}
            >
              {isPending ? "Ersetze …" : "Alles ersetzen"}
            </Button>
          </div>
        </div>
      </Overlay>
    </section>
  );
}
