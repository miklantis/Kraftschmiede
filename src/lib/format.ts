// Kleine, reine Formatierungs-Helfer fuer die Anzeige (1:1 aus V1).

// Heutiges Datum als "YYYY-MM-DD" in lokaler Zeit.
export function todayISO(d: Date = new Date()): string {
  const pad = (n: number): string => (n < 10 ? "0" + n : String(n));
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

// Langes deutsches Datum, z. B. "Montag, 22. Juni".
export function longDateDE(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateStr;
  }
}

// Zahl mit hoechstens zwei Nachkommastellen, ohne unnoetige Nullen.
export function fmtNum(x: number | null | undefined): string {
  if (x == null) return "–";
  return (Math.round(x * 100) / 100).toString().replace(/\.0+$/, "");
}

// Score wie V1: gerundete Zahl mit deutschem Dezimalkomma.
export function fmtScore(x: number | null | undefined): string {
  return fmtNum(x).replace(".", ",");
}

// Kompaktes deutsches Datum mit Wochentag, z. B. "Mo, 22. Juni" -> hier kurz
// "Mo., 22. Juni" wie im V1-Verlauf (Wochentag + Tag + Monat, alles kurz).
export function longDateShort(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

// Kilogramm mit deutschem Dezimalkomma (V1 fmtKg).
export function fmtKg(w: number | null | undefined): string {
  return fmtNum(w).replace(".", ",");
}
