import { useState } from "react";
import { useUserId } from "./useUserId";
import {
  buildExport,
  serializeExport,
  exportFilename,
} from "@/lib/exportData";
import { fetchAllData } from "@/lib/exportSource";
import { downloadTextFile, copyText } from "@/lib/download";

// Voll-Export: holt den kompletten Bestand (gemeinsame Quelle fetchAllData) und
// baut daraus das lesbare JSON. DOM-Seiten (Datei/Zwischenablage) liegen im
// download-Baustein, der Aufbau im reinen exportData-Modul. Der Hook
// orchestriert nur.

async function buildText(): Promise<string> {
  const raw = await fetchAllData();
  return serializeExport(buildExport(raw));
}

type Status = "idle" | "file" | "clipboard" | "error";

export function useExport(): {
  exportToFile: () => Promise<void>;
  exportToClipboard: () => Promise<void>;
  status: Status;
  isPending: boolean;
  error: string | null;
} {
  const userId = useUserId();
  const [status, setStatus] = useState<Status>("idle");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportToFile(): Promise<void> {
    if (userId === null) {
      setError("Nicht angemeldet.");
      setStatus("error");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const text = await buildText();
      downloadTextFile(exportFilename(), text);
      setStatus("file");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setIsPending(false);
    }
  }

  async function exportToClipboard(): Promise<void> {
    if (userId === null) {
      setError("Nicht angemeldet.");
      setStatus("error");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const text = await buildText();
      const ok = await copyText(text);
      if (!ok) throw new Error("Zwischenablage nicht verfuegbar.");
      setStatus("clipboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setIsPending(false);
    }
  }

  return { exportToFile, exportToClipboard, status, isPending, error };
}
