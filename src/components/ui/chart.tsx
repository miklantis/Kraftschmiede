import { useEffect, useRef, useState, type RefObject } from "react";
import { select, type Selection } from "d3-selection";
import { area, curveCatmullRom, line } from "d3-shape";
import { cn } from "@/lib/utils";

// Generisches Chart-Fundament (D3-getrieben). Kapselt die Mechanik, die alle
// Verlaufscharts teilen: Container-Breite messen, auf dem Handy bei vielen
// Datenpunkten horizontal scrollbar werden, und das SVG nach einem einheitlichen
// Stil zeichnen (glatte Linie, weiche Flaeche, heller Endpunkt-Ring, dunkler
// Tooltip). Die Domaene (Periodisierung jetzt, Uebungs-Verlauf in Phase 8) liefert
// nur den draw-Rueckruf und die Daten. D3 zeichnet imperativ ins SVG, damit spaeter
// Aufbau-Animationen (D3-Uebergaenge) sauber daraufsetzen koennen.

// Schrift im SVG: System-UI fuer Beschriftungen, Mono fuer Zahlen (wie V1).
export const CHART_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
export const CHART_MONO =
  "'Spline Sans Mono Variable',ui-monospace,SFMono-Regular,Menlo,monospace";

export interface ChartMargin {
  t: number;
  r: number;
  b: number;
  l: number;
}

export interface ChartDims {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: ChartMargin;
}

export type ChartSvg = Selection<SVGSVGElement, unknown, null, undefined>;
export type ChartG = Selection<SVGGElement, unknown, null, undefined>;
export type ChartDefs = Selection<SVGDefsElement, unknown, null, undefined>;

// Liest eine CSS-Theme-Variable (z. B. "--primary") vom Wurzelelement, mit
// Rueckfallwert. So nutzt D3 dieselben Tokens wie der Rest der Oberflaeche.
export function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

// Glatte Linie/Flaeche (Catmull-Rom) ueber generische Datenpunkte.
export function smoothLine<T>(x: (d: T) => number, y: (d: T) => number) {
  return line<T>().x(x).y(y).curve(curveCatmullRom.alpha(0.5));
}
export function smoothArea<T>(
  x: (d: T) => number,
  y0: number,
  y1: (d: T) => number,
) {
  return area<T>()
    .x(x)
    .y0(y0)
    .y1(y1)
    .curve(curveCatmullRom.alpha(0.5));
}

// Vertikaler Verlauf (oben getoent, unten transparent oder schwach) als
// Fuellung. Gibt die fuer fill="url(#id)" verwendbare Id zurueck.
export function appendAreaGradient(
  defs: ChartDefs,
  id: string,
  color: string,
  topOpacity: number,
  bottomOpacity = 0,
): string {
  const gr = defs
    .append("linearGradient")
    .attr("id", id)
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 1);
  gr.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", color)
    .attr("stop-opacity", topOpacity);
  gr.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", color)
    .attr("stop-opacity", bottomOpacity);
  return id;
}

// Balken-Pfad mit nur oben abgerundeten Ecken (SVG-rect rundet sonst alle vier).
export function topRoundedBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, w / 2, h);
  return (
    `M${x} ${y + h}` +
    `V${y + rr}` +
    `Q${x} ${y} ${x + rr} ${y}` +
    `H${x + w - rr}` +
    `Q${x + w} ${y} ${x + w} ${y + rr}` +
    `V${y + h}Z`
  );
}

// Heller, offener Ring auf der Kurve (Endpunkt bzw. "jetzt"-Marker).
export function appendEndpointRing(
  g: ChartG,
  cx: number,
  cy: number,
  color: string,
): void {
  g.append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", 4.5)
    .attr("fill", "#fff")
    .attr("stroke", color)
    .attr("stroke-width", 2.5);
}

export interface TooltipOptions {
  cx: number;
  cy: number;
  innerWidth: number;
  text: string;
  bg: string;
  fg?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  width?: number; // feste Breite; sonst aus der Textlaenge geschaetzt
  height?: number;
  gap?: number;
  radius?: number;
  minTop?: number; // hoechste erlaubte Oberkante (in den oberen Rand hinein < 0)
}

// Dunkler Tooltip mit kleinem Verbinder (Nub) zur Kurve. Stil identisch fuer den
// "jetzt"-Marker (feste Breite) und spaetere Hover-Tooltips (Breite aus Text).
export function appendTooltip(g: ChartG, o: TooltipOptions): void {
  const fontSize = o.fontSize ?? 16;
  const h = o.height ?? 30;
  const gap = o.gap ?? 9;
  const r = o.radius ?? 9;
  const w = o.width ?? Math.max(40, o.text.length * fontSize * 0.55 + 20);
  const minTop = o.minTop ?? 2;
  const fg = o.fg ?? "#fff";

  const tipCx = Math.max(w / 2, Math.min(o.innerWidth - w / 2, o.cx));
  const above = o.cy - gap - h >= minTop;
  const tipY = above ? o.cy - gap - h : o.cy + gap;
  const nubBase = above ? tipY + h : tipY;
  const nubTip = above ? nubBase + 6 : nubBase - 6;
  const nubX = Math.max(tipCx - w / 2 + 10, Math.min(tipCx + w / 2 - 10, o.cx));

  g.append("path")
    .attr(
      "d",
      `M${nubX - 5} ${nubBase}L${nubX + 5} ${nubBase}L${nubX} ${nubTip}Z`,
    )
    .attr("fill", o.bg);
  g.append("rect")
    .attr("x", tipCx - w / 2)
    .attr("y", tipY)
    .attr("width", w)
    .attr("height", h)
    .attr("rx", r)
    .attr("fill", o.bg);
  g.append("text")
    .attr("x", tipCx)
    .attr("y", tipY + h / 2 + fontSize / 3)
    .attr("text-anchor", "middle")
    .attr("fill", fg)
    .attr("font-size", fontSize)
    .attr("font-weight", o.fontWeight ?? 700)
    .attr("font-family", o.fontFamily ?? CHART_FONT)
    .text(o.text);
}

// Misst die Breite eines Elements und haelt sie bei Groessenaenderung aktuell.
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export interface ChartCanvasProps {
  height: number;
  margin: ChartMargin;
  minInnerWidth?: number; // Mindest-Plotbreite; darunter waechst die Grafik nicht
  draw: (svg: ChartSvg, dims: ChartDims) => void;
  ariaLabel?: string;
  className?: string;
  // Optionaler Fokuspunkt als Anteil der inneren Plotbreite (0 = links,
  // 1 = rechts). Ist die Grafik breiter als der Rahmen (Handy, lange Journey),
  // wird beim Oeffnen und beim Drehen sanft so gescrollt, dass dieser Punkt
  // mittig sitzt (am Rand abgeschnitten, statt leeren Raum zu zeigen). Passt
  // alles ins Bild (Desktop), gibt es nichts zu scrollen. Manuelles Scrollen
  // danach bleibt unangetastet.
  focusFraction?: number;
}

// Scrollbarer Rahmen plus SVG. Misst die verfuegbare Breite, bestimmt die
// Zeichenbreite (mindestens minInnerWidth) und ruft den draw-Rueckruf mit einer
// frisch geleerten Selektion und den Massen auf.
export function ChartCanvas({
  height,
  margin,
  minInnerWidth,
  draw,
  ariaLabel,
  className,
  focusFraction,
}: ChartCanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cw = useElementWidth(containerRef);
  const { t, r, b, l } = margin;

  // Scrollbar nur, wenn die Zeichnung breiter ist als der verfuegbare Platz
  // (Handy, lange Kurve). Passt alles ins Bild (Desktop, wenige Punkte), bleibt
  // der Rahmen unscrollbar: ueberstehendes wird beschnitten statt scrollbar.
  // Verhindert, dass beim Ziehen am Fenster kurzzeitig eine Scrollbar aufblitzt,
  // waehrend Rahmenbreite und SVG-Breite einen Frame auseinanderlaufen. Kleine
  // Toleranz gegen Rundungsflackern an der Grenze.
  const drawWidth = Math.max(cw, (minInnerWidth ?? 0) + l + r);
  const needsScroll = cw > 0 && drawWidth - cw > 0.5;

  useEffect(() => {
    const node = svgRef.current;
    if (!node || cw <= 0) return;
    const width = Math.max(cw, (minInnerWidth ?? 0) + l + r);
    const dims: ChartDims = {
      width,
      height,
      innerWidth: width - l - r,
      innerHeight: height - t - b,
      margin: { t, r, b, l },
    };
    const svg = select(node);
    svg.selectAll("*").remove();
    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");
    if (ariaLabel) svg.attr("role", "img").attr("aria-label", ariaLabel);
    draw(svg, dims);
  }, [cw, height, t, r, b, l, minInnerWidth, draw, ariaLabel]);

  // Fokuspunkt mittig scrollen, sobald die Breite steht (laeuft nach dem
  // Zeichnen). Nur wenn die Grafik breiter ist als der Rahmen; sonst nichts zu
  // tun. Greift bei Oeffnen, bei Breitenaenderung (Drehen) und wenn der Punkt
  // wandert - nicht bei manuellem Scrollen, da haengt der Effekt nicht dran.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || cw <= 0 || focusFraction == null) return;
    const width = Math.max(cw, (minInnerWidth ?? 0) + l + r);
    const overflow = width - cw;
    if (overflow <= 0) return; // passt komplett ins Bild
    const innerWidth = width - l - r;
    const target = l + Math.max(0, Math.min(1, focusFraction)) * innerWidth;
    const left = Math.max(0, Math.min(overflow, target - cw / 2));
    el.scrollTo({ left, behavior: "smooth" });
  }, [cw, minInnerWidth, focusFraction, l, r]);

  return (
    <div
      ref={containerRef}
      className={cn(
        needsScroll
          ? "overflow-x-auto [-webkit-overflow-scrolling:touch]"
          : "overflow-x-clip",
        className,
      )}
    >
      <svg ref={svgRef} />
    </div>
  );
}
