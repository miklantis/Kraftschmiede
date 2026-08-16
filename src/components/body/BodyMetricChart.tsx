import { useCallback, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import {
  appendAreaGradient,
  appendEndpointRing,
  appendTooltip,
  ChartCanvas,
  CHART_MONO,
  readToken,
  smoothArea,
  smoothLine,
  type ChartDims,
  type ChartSvg,
} from "@/components/ui/chart";
import { fmtScore } from "@/lib/format";

// Verlaufslinie einer Koerper-Messmetrik (Gewicht/Fett/Muskel/Wasser/Phasen-
// winkel) auf dem geteilten D3-Fundament, im V1-Look: glatte gruene Kurve mit
// weicher Flaeche, drei Hilfslinien und ein Mono-Wertlabel am letzten Punkt.
// Punkt-Darstellung und Tooltip folgen der Linien-Ansicht des Uebungs-Charts:
// je Punkt ein Punkt, der letzte als groesserer offener Ring, Tippen/Hovern
// zeigt den Wert. Die x-Achse ist ein Wochenraster: jeder Punkt steht auf dem
// Platz seiner Kalenderwoche (slot), Wochen ohne Messung bleiben leer, sodass
// Mess-Luecken als groesserer Abstand sichtbar werden. Die Kurve laeuft dabei
// durchgehend weiter.

const MARGIN = { t: 18, r: 16, b: 16, l: 10 };
// Mindestbreite je Wochen-Platz; darunter wird der Chart scrollbar. Etwas
// schmaler als frueher je Messung, weil das Wochenraster auch leere Plaetze
// enthaelt.
const PER_SLOT = 26;

export function BodyMetricChart({
  points,
  slots,
  unit,
  pad,
  milestoneLines,
  height = 180,
}: {
  // Wochen-Punkte (alt -> neu); slot = Wochen-Abstand zur ersten Messwoche.
  points: readonly { slot: number; value: number }[];
  // Anzahl Wochen-Plaetze einschliesslich der leeren dazwischen.
  slots: number;
  unit: string;
  pad: number;
  // Optionale Ziel-Linien (Meilensteine) der gewaehlten Metrik. Jede zeichnet
  // eine dezente Waagerechte auf Hoehe von value mit Label rechts. Leer/
  // undefiniert => Chart verhaelt sich unveraendert. Reine Richtwerte, daher
  // ohne Erreicht-Zustand.
  milestoneLines?: readonly { value: number; label: string }[];
  height?: number;
}): React.ReactElement {
  const n = points.length;
  const vals = useMemo(() => points.map((p) => p.value), [points]);

  const draw = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const ACC = readToken("--primary");
      const GRID = readToken("--border");
      const FAINT = readToken("--muted-foreground");
      const INK = readToken("--foreground");

      if (n === 0) {
        g.append("text")
          .attr("x", iw / 2)
          .attr("y", ih / 2)
          .attr("text-anchor", "middle")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 11)
          .text("für diese Metrik noch keine Messung");
        return;
      }

      let lo = Math.min(...vals);
      let hi = Math.max(...vals);
      if (lo === hi) {
        lo -= 1;
        hi += 1;
      } else {
        lo -= pad;
        hi += pad;
      }

      // Ziel-Linien in die Skala einbeziehen, damit sie im Bild liegen, auch
      // wenn ein Ziel ueber/unter den bisherigen Werten liegt. Etwas Luft oben
      // fuer das Label. Die Hilfslinien-Beschriftung nutzt die reine Wertespanne.
      const goals = milestoneLines ?? [];
      let axisLo = lo;
      let axisHi = hi;
      if (goals.length > 0) {
        const tv = goals.map((gl) => gl.value);
        axisLo = Math.min(lo, ...tv);
        axisHi = Math.max(hi, ...tv);
        if (axisLo === axisHi) {
          axisLo -= 1;
          axisHi += 1;
        }
        axisHi += (axisHi - axisLo) * 0.06;
      }

      // x-Achse ist das Wochenraster: die Domaene spannt alle Wochen-Plaetze,
      // ein Punkt sitzt auf dem Platz seiner Woche. Leere Wochen bleiben so als
      // Abstand stehen.
      const lastSlot = Math.max(1, slots - 1);
      const x = scaleLinear().domain([0, lastSlot]).range([0, iw]);
      const px = (slot: number) => (slots <= 1 ? iw / 2 : x(slot));
      const Y = (v: number) => ih - ((v - axisLo) / (axisHi - axisLo)) * ih;

      // Drei Hilfslinien (auf Basis der Ist-Wertespanne).
      const yScale = scaleLinear().domain([lo, hi]).range([Y(lo), Y(hi)]);
      yScale.ticks(3).forEach((t) => {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", iw)
          .attr("y1", yScale(t))
          .attr("y2", yScale(t))
          .attr("stroke", GRID)
          .attr("stroke-width", 1);
      });

      // Ziel-Linien: dezent gestrichelt, Label rechts oben an der Linie. Hinter
      // Flaeche/Kurve (zuerst gezeichnet). Reine Richtwerte, einheitliche Deckkraft.
      goals.forEach((gl) => {
        const gy = Y(gl.value);
        if (gy < -2 || gy > ih + 2) return;
        g.append("line")
          .attr("x1", 0)
          .attr("y1", gy)
          .attr("x2", iw)
          .attr("y2", gy)
          .attr("stroke", FAINT)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3 3")
          .attr("opacity", 0.85);
        g.append("text")
          .attr("x", iw)
          .attr("y", gy - 4)
          .attr("text-anchor", "end")
          .attr("fill", FAINT)
          .attr("opacity", 0.85)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 10)
          .text(gl.label);
      });

      const co = points.map((p) => ({ y: p.value, cx: px(p.slot) }));

      const gid = "bodyarea" + Math.random().toString(36).slice(2, 7);
      appendAreaGradient(svg.append("defs"), gid, ACC, 0.18);
      g.append("path")
        .attr("d", smoothArea<(typeof co)[number]>((d) => d.cx, ih, (d) => Y(d.y))(co) ?? "")
        .attr("fill", `url(#${gid})`);
      g.append("path")
        .attr("d", smoothLine<(typeof co)[number]>((d) => d.cx, (d) => Y(d.y))(co) ?? "")
        .attr("fill", "none")
        .attr("stroke", ACC)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

      // Punkt je Messwoche; der letzte als groesserer offener Ring.
      co.forEach((p, i) => {
        if (i === n - 1) return;
        g.append("circle")
          .attr("cx", p.cx)
          .attr("cy", Y(p.y))
          .attr("r", 2.8)
          .attr("fill", ACC);
      });

      const last = co[n - 1];
      appendEndpointRing(g, last.cx, Y(last.y), ACC);
      g.append("text")
        .attr("x", last.cx)
        .attr("y", Y(last.y) - 12)
        .attr("text-anchor", "end")
        .attr("fill", INK)
        .attr("font-size", 13)
        .attr("font-weight", 700)
        .attr("font-family", CHART_MONO)
        .text(fmtScore(last.y) + " " + unit);

      // Tooltip je Punkt (Tippen/Hovern), grosszuegige Trefferflaeche.
      let tipTO: ReturnType<typeof setTimeout> | null = null;
      const hideTip = () => g.selectAll(".body-tip").remove();
      const showTip = (i: number) => {
        if (tipTO) {
          clearTimeout(tipTO);
          tipTO = null;
        }
        hideTip();
        const tip = g.append("g").attr("class", "body-tip");
        appendTooltip(tip, {
          cx: co[i].cx,
          cy: Y(co[i].y),
          innerWidth: iw,
          text: fmtScore(co[i].y) + " " + unit,
          bg: INK,
          fontFamily: CHART_MONO,
          fontSize: 14,
          height: 26,
        });
      };
      co.forEach((p, i) => {
        g.append("circle")
          .attr("cx", p.cx)
          .attr("cy", Y(p.y))
          .attr("r", 12)
          .attr("fill", "transparent")
          .style("cursor", "pointer")
          .on("mouseenter", () => showTip(i))
          .on("mouseleave", hideTip)
          .on("touchstart", () => {
            showTip(i);
            if (tipTO) clearTimeout(tipTO);
            tipTO = setTimeout(hideTip, 1800);
          });
      });
    },
    [points, vals, n, slots, unit, pad, milestoneLines],
  );

  return (
    <ChartCanvas
      height={height}
      margin={MARGIN}
      minInnerWidth={slots * PER_SLOT}
      draw={draw}
      ariaLabel="Messverlauf"
    />
  );
}
