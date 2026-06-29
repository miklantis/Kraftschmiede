import { changelogFile, type ChangelogEntry } from "@/schemas";

// Holt die Changelog-Datei frisch aus dem Netz (nie aus dem Cache) und liefert
// den neuesten Eintrag - also den der wartenden Version. Die Datei ist nicht im
// Precache (kein json-Glob), und der Update-Hinweis erscheint ohnehin nur
// online, daher ist der Netz-Abruf unproblematisch. Liegt eine unerwartete Form
// vor, wird null geliefert (das Popup zeigt dann nur "Aktualisieren").
export async function fetchLatestChangelog(): Promise<ChangelogEntry | null> {
  const versions = await fetchChangelogVersions();
  return versions[0] ?? null;
}

// Holt die komplette Changelog-Datei frisch aus dem Netz und liefert alle
// Versionen (newest-first). Fuer die Versionsverlauf-Unterseite. Liegt eine
// unerwartete Form vor, wird eine leere Liste geliefert.
export async function fetchChangelogVersions(): Promise<ChangelogEntry[]> {
  const url = `${import.meta.env.BASE_URL}changelog.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Changelog nicht erreichbar (" + String(res.status) + ").");
  }
  const parsed = changelogFile.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.versions;
}
