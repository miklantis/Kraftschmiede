import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MUSCLES, expand, type MuscleView } from "@/lib/muscles";
import bodySvgRaw from "@/assets/body-muscles.svg?raw";

// Die Master-SVG traegt aus Illustrator bunte Klassenfarben (.st0..st14). Die
// werden hier EINMALIG neutralisiert (alle auf den Silhouetten-Grauton), damit
// beim allerersten Zeichnen - bevor der Einfaerbe-Effekt unten laeuft - nichts
// Buntes aufblitzt. Ohne das blieb die rohe SVG sichtbar, solange kein Werte-
// Update einen zweiten Effekt-Lauf ausloeste (z. B. Koerper-Seite ohne heutigen
// Kater-Eintrag). Die echten Farben setzt weiterhin der Effekt (Silhouette =
// base, Region = idle/colorFn). Pfaddaten bleiben unberuehrt.
const bodySvg = bodySvgRaw.replace(/fill:\s*[^;}]+/g, "fill:#cfd3d8");

// Generisches Muscle-Map-Primitive. Faerbt die Regionen der Single-Master-SVG
// (src/assets/body-muscles.svg) anhand einer Werte-Map ein. Die Komponente
// kennt KEINE Domaene und KEINE feste Farbe: sie weiss nichts von "Beteiligung"
// oder "Muskelkater". Die Farbgebung wird ueber colorFn hereingereicht; ohne
// Vorgabe nimmt sie die Markengruen-Rampe. So nutzt die Uebungs-Detailseite
// (Beteiligung pro Uebung) und spaeter die Koerper-Seite (Muskelkater-Shading,
// Phase 9) exakt dieselbe Komponente, nur mit anderer colorFn/idle.
//
// SVG = nur Form + id; alle Bedeutung lebt in der Registry (src/lib/muscles.ts)
// und der DB. Die Werte-Map darf Region-, Gruppen- ODER Sektions-Keys mischen;
// expand() loest sie auf reine Region->Wert auf (region schlaegt group schlaegt
// section). Mehrfaches Einbetten ist sicher: die SVG hat keine internen
// id-Referenzen (kein <use>, kein url(#...)), und die Regionen werden im eigenen
// Teilbaum ueber den Ref-Scope gesucht.

export type MuscleMapView = MuscleView | "both";

const SILHOUETTE_IDS = ["silhouette_back", "silhouette_front"] as const;

// Bestaetigte Crop-Werte aus V1 (etwas Rand). "both" eng um beide Figuren, damit
// sie die Flaeche fuellen statt im Leerraum der vollen Master-viewBox zu schwimmen.
const VIEWBOX: Record<MuscleMapView, string> = {
  back: "181 108 386 1257",
  front: "771 112 379 1268",
  both: "165 92 1000 1304",
};

const BASE_DEFAULT = "#cfd3d8"; // Silhouette (Koerperform), haelt Kontrast zum Canvas
const IDLE_DEFAULT = "#c2c6cb"; // nicht beanspruchte Regionen, leicht dunkler

// --- Farb-Helfer (Default-Rampe weiss -> --accent), 1:1 aus V1 -----------------
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function readPrimary(): string {
  if (typeof window === "undefined") return "#0c9d77";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  return v || "#0c9d77";
}

function hexToRgb(h: string): { r: number; g: number; b: number } {
  let s = (h ?? "").trim();
  if (s.charAt(0) === "#") s = s.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = Number.parseInt(s, 16);
  if (Number.isNaN(n) || s.length !== 6) return { r: 12, g: 157, b: 119 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(n: number): string {
  const s = Math.round(n).toString(16);
  return s.length === 1 ? "0" + s : s;
}

function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return (
    "#" +
    toHex(x.r + (y.r - x.r) * t) +
    toHex(x.g + (y.g - x.g) * t) +
    toHex(x.b + (y.b - x.b) * t)
  );
}

// Inline-Fill auf Element UND alle enthaltenen <path> setzen. Ueberschreibt die
// klassenbasierten Illustrator-Fuellungen der Master-SVG zuverlaessig (greift
// auch durch die Silhouetten-Gruppen auf die Koerper-Teile durch).
function setFill(el: Element | null, color: string): void {
  if (!el) return;
  (el as SVGElement).style.fill = color;
  el.querySelectorAll("path").forEach((p) => {
    (p as SVGPathElement).style.fill = color;
  });
}

export interface MuscleMapProps {
  // Werte-Map: Region-, Gruppen- oder Sektions-Keys -> Intensitaet 0..1.
  values: Record<string, number>;
  // Welche Ansicht. Standard "both" (beide Figuren nebeneinander, kein Umschalter).
  view?: MuscleMapView;
  // Farbfunktion fuer beanspruchte Regionen (v 0..1 -> Farbe). Ohne Vorgabe:
  // Rampe weiss -> --primary (Markengruen; schwach hell, stark kraeftig). Hier
  // wird die Komponente fuer andere Zwecke umgefaerbt (z. B. Koerper-Seite, Phase 9).
  colorFn?: (v: number) => string;
  // Silhouetten-Farbe (Koerperform).
  base?: string;
  // Farbe nicht beanspruchter Regionen.
  idle?: string;
  className?: string;
  ariaLabel?: string;
}

export function MuscleMap({
  values,
  view = "both",
  colorFn,
  base = BASE_DEFAULT,
  idle = IDLE_DEFAULT,
  className,
  ariaLabel = "Beanspruchte Muskeln",
}: MuscleMapProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector("svg");
    if (!svg) return;

    // Zuschnitt + responsive Skalierung (Hoehe folgt aus der viewBox).
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("viewBox", VIEWBOX[view] ?? VIEWBOX.both);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", ariaLabel);
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "auto";

    // Einfaerben: Silhouette = base, beanspruchte Region = colorFn(v), Rest = idle.
    const brand = readPrimary();
    const paint =
      colorFn ?? ((v: number) => mix("#ffffff", brand, 0.35 + 0.65 * clamp01(v)));
    const regionValues = expand(values ?? {});

    for (const id of SILHOUETTE_IDS) {
      setFill(svg.querySelector("#" + id), base);
    }
    for (const m of MUSCLES) {
      const el = svg.querySelector("#" + m.id);
      const v = regionValues[m.id];
      setFill(el, v != null && v > 0 ? paint(v) : idle);
    }
  }, [values, view, colorFn, base, idle, ariaLabel]);

  return (
    <div
      ref={ref}
      className={cn("mx-auto w-full max-w-[360px]", className)}
      // SVG einmalig einbetten; React reconciled den Inhalt nicht (gleicher
      // String), der Effekt faerbt nach jedem Werte-Wechsel neu.
      dangerouslySetInnerHTML={{ __html: bodySvg }}
    />
  );
}
