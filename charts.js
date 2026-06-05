/* Kraftschmiede – charts.js (Schema 0.14). Vanilla JS, framework-frei.
   SVG-Charts, Plate-Loader und Journey-Periodisierungskurve (D3).
   Aus app.js ausgelagert. Greift ueber window.KS auf geteilte Helfer und
   State zu (db()/esc/fmtNum/fmtW/activeJourney, KS.UI). DB wird nie als
   Variable gehalten, immer ueber den Getter db() gelesen – so bleibt die
   Referenz nach setDB() in app.js korrekt.
   Setzt window.FSE (engine.js) voraus; d3 optional (drawJourneyChart). */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});
  var E = window.FSE;

  /* duenne Wrapper auf geteilte Helfer/State aus app.js (window.KS) */
  function db() { return KS.db(); }
  function esc(s) { return KS.esc(s); }
  function fmtNum(x) { return KS.fmtNum(x); }
  function fmtW(x) { return KS.fmtW(x); }
  function activeJourney() { return KS.activeJourney(); }

  /* =========================================================
     Charts (SVG)
     ========================================================= */
  function lineChart(points, opts) {
    opts = opts || {}; var w = opts.w || 460, h = opts.h || 150, pad = 26;
    if (!points.length) return emptyChart(w, h);
    var ys = points.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    var n = points.length;
    function X(i) { return pad + (n === 1 ? (w - 2 * pad) / 2 : i * (w - 2 * pad) / (n - 1)); }
    function Y(v) { return h - pad - (v - min) / (max - min) * (h - 2 * pad); }
    var d = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(p.y).toFixed(1); }).join(" ");
    var dots = points.map(function (p, i) {
      var c = p.flag ? "var(--bad)" : "var(--accent)";
      return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (p.flag ? 4 : 3) + '" fill="' + c + '"/>';
    }).join("");
    var grid = '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" class="axis"/>'
      + '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (h - pad) + '" class="axis"/>';
    var labels = '<text x="' + (pad - 4) + '" y="' + (Y(max) + 4) + '" class="ctick" text-anchor="end">' + fmtNum(max) + '</text>'
      + '<text x="' + (pad - 4) + '" y="' + (Y(min) + 4) + '" class="ctick" text-anchor="end">' + fmtNum(min) + '</text>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" preserveAspectRatio="xMidYMid meet">' + grid + labels
      + '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2"/>' + dots + '</svg>';
  }
  function barChart(items, opts) {
    opts = opts || {}; var w = opts.w || 460, h = opts.h || 150, pad = 26;
    if (!items.length) return emptyChart(w, h);
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })); if (max <= 0) max = 1;
    var n = items.length, gap = 6, bw = (w - 2 * pad - gap * (n - 1)) / n;
    var bars = items.map(function (it, i) {
      var bh = (it.value / max) * (h - 2 * pad); var x = pad + i * (bw + gap); var y = h - pad - bh;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="var(--accent)"/>'
        + (n <= 10 ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - pad + 12) + '" class="ctick" text-anchor="middle">' + esc(it.label) + '</text>' : '');
    }).join("");
    var axis = '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" class="axis"/>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" preserveAspectRatio="xMidYMid meet">' + axis
      + '<text x="' + (pad - 4) + '" y="' + (pad + 4) + '" class="ctick" text-anchor="end">' + fmtNum(max) + '</text>' + bars + '</svg>';
  }
  function emptyChart(w, h) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart"><text x="' + (w / 2) + '" y="' + (h / 2) + '" class="ctick" text-anchor="middle">noch keine Daten</text></svg>'; }

  /* =========================================================
     Plate-Loader
     ========================================================= */
  function plateLoaderSVG(total, bar) {
    var pb = E.plateBreakdown(total, bar.weight, db().inventory.plates);
    var colors = { "25": "#ef5b5b", "20": "#3f7fff", "15": "#f5b53d", "10": "#5ec26a", "5": "#e8e8ea", "2.5": "#9aa0aa", "1.25": "#6b7280" };
    var seq = []; pb.plates.forEach(function (p) { for (var i = 0; i < p.count; i++) seq.push(p.plate); });
    var w = 300, h = 90, cx = 150, sleeveY = h / 2;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" class="plate-svg">';
    s += '<rect x="' + (cx - 6) + '" y="' + (sleeveY - 4) + '" width="' + (w / 2 - 10) + '" height="8" rx="2" fill="#3a3d44"/>'; // sleeve
    var x = cx + 6;
    seq.forEach(function (p) {
      var ph = 18 + (p / 25) * 56; var pw = Math.max(7, 6 + p / 4);
      var col = colors[String(p)] || "#888";
      s += '<rect x="' + x.toFixed(1) + '" y="' + (sleeveY - ph / 2).toFixed(1) + '" width="' + pw.toFixed(1) + '" height="' + ph.toFixed(1) + '" rx="2" fill="' + col + '" stroke="#0008"/>';
      s += '<text x="' + (x + pw / 2).toFixed(1) + '" y="' + (sleeveY + ph / 2 + 10).toFixed(1) + '" class="ptick" text-anchor="middle">' + fmtNum(p) + '</text>';
      x += pw + 3;
    });
    s += '<rect x="' + (cx - 14) + '" y="' + (sleeveY - 10) + '" width="14" height="20" rx="2" fill="#2a2d33"/>'; // collar/inner
    s += '</svg>';
    var label = pb.remainder > 0
      ? '<span class="warn-inline">nicht exakt ladbar (Rest ' + fmtW(pb.remainder * 2) + ')</span>'
      : (seq.length ? 'pro Seite: ' + pb.plates.map(function (p) { return p.count + "×" + fmtNum(p.plate); }).join(" + ") : 'nur Stange');
    return { svg: s, label: label, perSide: pb.perSide };
  }

  // Stoppuhr-Icon fuer den Pausen-Timer-Toggle im Workout-Kopf.
  function timerIcon() { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 13l3-2"></path><path d="M9 2h6"></path><path d="M12 5V2"></path></svg>'; }
  function xIcon() { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>'; }
  // Hantel-/Scheiben-Icon, geteilt von Scheiben-Hinweis und Toggle-Button.
  function plateIcon(cls) { return '<svg class="' + cls + '" viewBox="0 0 16 16" aria-hidden="true"><rect x="6.7" y="2" width="2.6" height="12" rx="1"/><rect x="3.6" y="4.4" width="2" height="7.2" rx="1"/><rect x="10.4" y="4.4" width="2" height="7.2" rx="1"/></svg>'; }
  // Dezente Scheiben-Anzeige: kleines Icon + Scheiben pro Seite (Zahl). Kein großer SVG.
  function plateHint(total, bar) {
    if (!bar) return "";
    var pb = E.plateBreakdown(total, bar.weight, db().inventory.plates);
    var icon = plateIcon("phint-ic");
    var txt;
    if (pb.remainder > 0) txt = '<span class="phint-warn">nicht exakt ladbar (Rest ' + fmtW(pb.remainder * 2) + ')</span>';
    else if (!pb.plates.length) txt = 'nur Stange';
    else txt = pb.plates.reduce(function (acc, p) { for (var i = 0; i < p.count; i++) acc.push(fmtNum(p.plate)); return acc; }, []).join(' \u00B7 ');
    return '<span class="phint" title="Scheiben pro Seite">' + icon + '<span class="phint-t">' + txt + '</span></span>';
  }

  // Heat-Farbe je Scheibengewicht: leicht=gelb -> schwer=rot
  function plateColor(p) {
    var ps = db().inventory.plates; var mn = Math.min.apply(null, ps), mx = Math.max.apply(null, ps);
    var r = mx > mn ? (p - mn) / (mx - mn) : 0; r = Math.max(0, Math.min(1, r));
    var hue = Math.round(52 - 52 * r);
    var light = Math.round(60 - 12 * r);
    return "hsl(" + hue + ",80%," + light + "%)";
  }
  // Farbige Scheiben-Boxen (pro Scheibe eine Box), nur Zahl. Ersetzt Lesen durch Schauen.
  function plateChips(total, bar) {
    if (!bar) return "";
    var pb = E.plateBreakdown(total, bar.weight, db().inventory.plates);
    if (pb.remainder > 0) return '<span class="pchips"><span class="pchip rest" title="nicht exakt ladbar">Rest ' + fmtNum(pb.remainder * 2) + '</span></span>';
    if (!pb.plates.length) return '<span class="pchips"><span class="pchip bar">nur Stange</span></span>';
    var chips = [];
    pb.plates.forEach(function (p) { for (var i = 0; i < p.count; i++) { chips.push('<span class="pchip" style="background:' + plateColor(p.plate) + '">' + fmtNum(p.plate) + '</span>'); } });
    return '<span class="pchips" title="Scheiben pro Seite – Reihenfolge von innen nach außen">' + chips.join("") + '</span>';
  }

  /* =========================================================
     Journey-Periodisierungskurve (D3)
     ========================================================= */
  function drawJourneyChart() {
    var el = document.getElementById("ks-journey-chart");
    if (!el || typeof d3 === "undefined") return;
    var j = activeJourney();
    if (!j || !j.phases || !j.phases.length) { el.innerHTML = ""; return; }

    // Bei Fenster-/Orientierungsaenderung im Journey-Tab scharf neu zeichnen (einmalig gebunden).
    if (!window.__ksJourneyResizeBound) {
      window.__ksJourneyResizeBound = true;
      var _rt;
      window.addEventListener("resize", function () {
        clearTimeout(_rt);
        _rt = setTimeout(function () {
          if (KS.UI.tab === "journey" && !KS.UI.journeyPicker) drawJourneyChart();
        }, 150);
      });
    }

    var weeks = [], bands = [], gw = 0;
    var vMin = Infinity, vMax = -Infinity, iMin = Infinity, iMax = -Infinity;
    j.phases.forEach(function (p, pi) {
      var pw = Math.max(1, p.weeks || 1);
      var mid = p.repTarget ? (p.repTarget[0] + p.repTarget[1]) / 2 : 8;
      var iScore = 1 / Math.max(1, mid);
      bands.push({ name: p.name || ("Phase " + (pi + 1)), start: gw, end: gw + pw - 1 });
      for (var wi = 0; wi < pw; wi++) {
        var vol = E.volumeForWeek(p, wi, true);
        weeks.push({ g: gw, vol: vol, intens: iScore, wi: wi, deload: !!(p.deloadWeek && wi === p.deloadWeek - 1) });
        vMin = Math.min(vMin, vol); vMax = Math.max(vMax, vol);
        iMin = Math.min(iMin, iScore); iMax = Math.max(iMax, iScore);
        gw++;
      }
    });
    var N = weeks.length;

    // Aktuelle Position aus dem trainingsgetriebenen Fortschritt (0-basierte Gesamtwoche).
    var pl = KS.journeyPlacement(j, db().sessions, db().settings.weeklyFrequencyTarget || 3);
    var curG = Math.max(0, Math.min((pl.globalWeek || 1) - 1, N - 1));

    function ny(v, lo, hi) { var t = hi > lo ? (v - lo) / (hi - lo) : 0.5; return 0.10 + t * 0.80; }

    // In echten CSS-Pixeln zeichnen (1 viewBox-Einheit = 1 px): Breite aus dem
    // Container messen, aber mindestens ~48px pro Woche, damit nichts gequetscht
    // wird. Ist die Mindestbreite groesser als der Container (Mobile), wird die
    // Grafik breiter als der Container und horizontal scrollbar. Hoehe fest.
    var H = 230, m = { t: 38, r: 16, b: 46, l: 16 };
    var minW = N * 48 + m.l + m.r;
    var W = Math.max(Math.round(el.clientWidth || 680), minW);
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    d3.select(el).selectAll("*").remove();
    var svg = d3.select(el).append("svg")
      .attr("viewBox", "0 0 " + W + " " + H).attr("width", W).attr("height", H)
      .style("display", "block")
      .attr("role", "img").attr("aria-label", "Periodisierung der Journey " + (j.name || ""));

    // Legende in eigenem Streifen oben, klar getrennt vom Kurvenbereich
    var lg = svg.append("g").attr("transform", "translate(" + m.l + ",16)");
    lg.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 20).attr("y2", 0).style("stroke", "var(--accent)").style("stroke-width", 1.8);
    lg.append("text").attr("x", 26).attr("y", 3.5).style("fill", "var(--muted)").style("font-family", "var(--mono)").style("font-size", "11px").text("Volumen");
    lg.append("line").attr("x1", 102).attr("y1", 0).attr("x2", 122).attr("y2", 0).style("stroke", "var(--accent-2)").style("stroke-width", 1.8).style("stroke-dasharray", "5 4");
    lg.append("text").attr("x", 128).attr("y", 3.5).style("fill", "var(--muted)").style("font-family", "var(--mono)").style("font-size", "11px").text("Intensität");

    var g = svg.append("g").attr("transform", "translate(" + m.l + "," + m.t + ")");
    var x = d3.scaleLinear().domain([0, Math.max(1, N - 1)]).range([0, iw]);
    function yPix(t01) { return ih - t01 * ih; }

    bands.forEach(function (b, bi) {
      var x0 = Math.max(0, x(b.start - 0.5));
      var x1 = Math.min(iw, x(b.end + 0.5));
      if (bi % 2 === 1) {
        g.append("rect").attr("x", x0).attr("y", 0).attr("width", Math.max(0, x1 - x0)).attr("height", ih)
          .style("fill", "var(--panel2)").style("opacity", 0.5);
      }
      if (bi > 0) {
        g.append("line").attr("x1", x0).attr("y1", 0).attr("x2", x0).attr("y2", ih)
          .style("stroke", "var(--line2)").style("stroke-dasharray", "3 4").style("stroke-width", 1);
      }
      // Label an den Raendern verankern, damit es nicht abgeschnitten wird
      var lmid = (x0 + x1) / 2, lanchor = "middle", lx = lmid;
      if (lmid < 30) { lanchor = "start"; lx = 0; } else if (lmid > iw - 30) { lanchor = "end"; lx = iw; }
      g.append("text").attr("x", lx).attr("y", ih + 20).attr("text-anchor", lanchor)
        .style("fill", "var(--muted)").style("font-family", "var(--mono)").style("font-size", "11px")
        .text(b.name);
    });

    g.append("line").attr("x1", 0).attr("y1", ih).attr("x2", iw).attr("y2", ih).style("stroke", "var(--line2)").style("stroke-width", 1);

    // Subtile Wochen-Andeutung INNERHALB der Phasen: jede zweite Woche minimal aufgehellt.
    // Bewusst sehr schwach (WK_TINT), damit die Phasen-Baender dominant bleiben und man die
    // Wochenzahl je Phase nur ahnt. Alternierung startet je Phase neu bei wi=0, daher bleibt
    // der Phasenanfang stabil. Liegt unter Kurven und "jetzt"-Linie.
    var WK_TINT = 0.06;
    weeks.forEach(function (w) {
      if (w.wi % 2 !== 1) return;
      var wx0 = Math.max(0, x(w.g - 0.5)), wx1 = Math.min(iw, x(w.g + 0.5));
      g.append("rect").attr("x", wx0).attr("y", 0).attr("width", Math.max(0, wx1 - wx0)).attr("height", ih)
        .style("fill", "var(--text)").style("opacity", WK_TINT);
    });

    var volLine = d3.line().x(function (d) { return x(d.g); }).y(function (d) { return yPix(ny(d.vol, vMin, vMax)); }).curve(d3.curveCatmullRom.alpha(0.5));
    var intLine = d3.line().x(function (d) { return x(d.g); }).y(function (d) { return yPix(ny(d.intens, iMin, iMax)); }).curve(d3.curveCatmullRom.alpha(0.5));

    g.append("path").datum(weeks).attr("d", intLine).style("fill", "none").style("stroke", "var(--accent-2)").style("stroke-width", 1.6).style("stroke-dasharray", "5 4").style("stroke-linejoin", "round").style("stroke-linecap", "round");
    g.append("path").datum(weeks).attr("d", volLine).style("fill", "none").style("stroke", "var(--accent)").style("stroke-width", 1.6).style("stroke-linejoin", "round").style("stroke-linecap", "round");

    weeks.filter(function (d) { return d.deload; }).forEach(function (d) {
      g.append("circle").attr("cx", x(d.g)).attr("cy", yPix(ny(d.vol, vMin, vMax))).attr("r", 3).style("fill", "var(--warn)");
    });

    var cx = x(Math.min(curG, N - 1)), atEnd = cx > iw - 30;
    g.append("line").attr("x1", cx).attr("y1", 0).attr("x2", cx).attr("y2", ih).style("stroke", "var(--text)").style("stroke-width", 1.2);
    g.append("circle").attr("cx", cx).attr("cy", ih).attr("r", 3.5).style("fill", "var(--text)");
    g.append("text").attr("x", cx + (atEnd ? -5 : 5)).attr("y", 11).attr("text-anchor", atEnd ? "end" : "start").style("fill", "var(--text)").style("font-family", "var(--mono)").style("font-size", "10px").text("jetzt");
  }

  /* =========================================================
     Uebungs-Verlaufscharts (D3) – gleicher Stil wie Journey
     Container <div class="ks-exchart" data-ex data-metric>. Daten
     kommen aus KS.exerciseChartData(ex); jeder Container misst seine
     eigene Breite und zeichnet sich selbst (Detail-View und Dashboard).
     ========================================================= */
  function exChartResizeBind() {
    if (window.__ksExerciseResizeBound) return;
    window.__ksExerciseResizeBound = true;
    var _rt;
    window.addEventListener("resize", function () {
      clearTimeout(_rt);
      _rt = setTimeout(function () { if (KS.UI.tab === "exercises") drawExerciseCharts(); }, 150);
    });
  }

  // gemeinsame Geometrie: in echten Pixeln zeichnen, Container messen,
  // Mindestbreite je Datenpunkt -> auf Mobile bei Bedarf horizontal scrollbar.
  function exDims(el, n, perPoint) {
    var H = 156, m = { t: 14, r: 14, b: 22, l: 40 };
    var minW = Math.max(0, n - 1) * perPoint + m.l + m.r + 28;
    var W = Math.max(Math.round(el.clientWidth || 320), minW);
    return { H: H, m: m, W: W, iw: W - m.l - m.r, ih: H - m.t - m.b };
  }

  // Linienreihe (rm/weight/reps/score). points: [{ y, flag }]
  function drawExLine(el, points) {
    d3.select(el).selectAll("*").remove();
    var n = points.length;
    var D = exDims(el, n, 26);
    if (!n) { el.innerHTML = emptyChart(D.W, D.H); return; }
    var ys = points.map(function (p) { return p.y; });
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (lo === hi) { lo -= 1; hi += 1; }
    var x = d3.scaleLinear().domain([0, Math.max(1, n - 1)]).range([0, D.iw]);
    function px(i) { return n === 1 ? D.iw / 2 : x(i); }
    function Y(v) { return D.ih - (v - lo) / (hi - lo) * D.ih; }
    var svg = d3.select(el).append("svg")
      .attr("viewBox", "0 0 " + D.W + " " + D.H).attr("width", D.W).attr("height", D.H)
      .style("display", "block").attr("role", "img");
    var g = svg.append("g").attr("transform", "translate(" + D.m.l + "," + D.m.t + ")");
    g.append("line").attr("x1", 0).attr("y1", D.ih).attr("x2", D.iw).attr("y2", D.ih).style("stroke", "var(--line2)").style("stroke-width", 1);
    [{ v: hi, y: Y(hi) }, { v: lo, y: Y(lo) }].forEach(function (t) {
      g.append("text").attr("x", -6).attr("y", t.y + 3.5).attr("text-anchor", "end")
        .style("fill", "var(--faint)").style("font-family", "var(--mono)").style("font-size", "10px").text(fmtNum(t.v));
    });
    var line = d3.line().x(function (d, i) { return px(i); }).y(function (d) { return Y(d.y); }).curve(d3.curveCatmullRom.alpha(0.5));
    g.append("path").datum(points).attr("d", line).style("fill", "none").style("stroke", "var(--accent)").style("stroke-width", 1.8).style("stroke-linejoin", "round").style("stroke-linecap", "round");
    points.forEach(function (p, i) {
      g.append("circle").attr("cx", px(i)).attr("cy", Y(p.y)).attr("r", p.flag ? 3.6 : 2.8).style("fill", p.flag ? "var(--bad)" : "var(--accent)");
    });
  }

  // Balkenreihe (Wochenvolumen). items: [{ label, value }]
  function drawExBars(el, items) {
    d3.select(el).selectAll("*").remove();
    var n = items.length;
    var D = exDims(el, n, 30);
    if (!n) { el.innerHTML = emptyChart(D.W, D.H); return; }
    var D2 = { H: D.H, m: { t: D.m.t, r: D.m.r, b: 28, l: D.m.l }, W: D.W, iw: D.iw, ih: D.H - D.m.t - 28 };
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })); if (max <= 0) max = 1;
    var svg = d3.select(el).append("svg")
      .attr("viewBox", "0 0 " + D2.W + " " + D2.H).attr("width", D2.W).attr("height", D2.H)
      .style("display", "block").attr("role", "img");
    var g = svg.append("g").attr("transform", "translate(" + D2.m.l + "," + D2.m.t + ")");
    g.append("line").attr("x1", 0).attr("y1", D2.ih).attr("x2", D2.iw).attr("y2", D2.ih).style("stroke", "var(--line2)").style("stroke-width", 1);
    g.append("text").attr("x", -6).attr("y", 3.5).attr("text-anchor", "end").style("fill", "var(--faint)").style("font-family", "var(--mono)").style("font-size", "10px").text(fmtNum(max));
    var gap = 6, bw = (D2.iw - gap * (n - 1)) / n;
    items.forEach(function (it, i) {
      var bh = (it.value / max) * D2.ih, bx = i * (bw + gap), by = D2.ih - bh;
      g.append("rect").attr("x", bx.toFixed(1)).attr("y", by.toFixed(1)).attr("width", Math.max(1, bw).toFixed(1)).attr("height", Math.max(0, bh).toFixed(1)).attr("rx", 2).style("fill", "var(--accent)");
      if (n <= 14) g.append("text").attr("x", (bx + bw / 2).toFixed(1)).attr("y", D2.ih + 13).attr("text-anchor", "middle").style("fill", "var(--faint)").style("font-family", "var(--mono)").style("font-size", "10px").text(esc(it.label));
    });
  }

  function drawExerciseCharts() {
    if (typeof d3 === "undefined") return;
    var nodes = document.querySelectorAll(".ks-exchart");
    if (!nodes.length) return;
    exChartResizeBind();
    Array.prototype.forEach.call(nodes, function (el) {
      var ex = KS.exById(el.getAttribute("data-ex"));
      var metric = el.getAttribute("data-metric");
      if (!ex) { el.innerHTML = ""; return; }
      var data = KS.exerciseChartData(ex);
      if (metric === "volume") drawExBars(el, data.volume || []);
      else drawExLine(el, data[metric] || []);
    });
  }

  /* =========================================================
     Skill-Langzeit-Chart: trainierte Phase je Session ueber die
     Zeit (Stufenlinie). Punkte nach Ergebnis gefaerbt. Quelle:
     sessions[].skillWork (type:"skill"). Anlehnung an die Ex-Charts.
     ========================================================= */
  function skillChartData(skillId) {
    var def = KS.skillById(skillId);
    var phases = def ? def.phases.length : 1;
    var pts = (db().sessions || [])
      .filter(function (s) { return s.type === "skill" && s.status === "done" && s.skillWork && s.skillWork.skillId === skillId; })
      .slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); })
      .map(function (s) { return { y: s.skillWork.phase || 0, result: s.skillWork.result, date: s.date }; });
    return { points: pts, phases: phases };
  }
  function skillChartResizeBind() {
    if (window.__ksSkillResizeBound) return;
    window.__ksSkillResizeBound = true;
    var _rt;
    window.addEventListener("resize", function () {
      clearTimeout(_rt);
      _rt = setTimeout(function () { if (KS.UI.tab === "skills") drawSkillCharts(); }, 150);
    });
  }
  function drawSkillChart(el, data) {
    d3.select(el).selectAll("*").remove();
    var pts = data.points, n = pts.length;
    var D = exDims(el, n, 26);
    if (!n) { el.innerHTML = emptyChart(D.W, D.H); return; }
    var maxIdx = Math.max(1, data.phases - 1);
    var x = d3.scaleLinear().domain([0, Math.max(1, n - 1)]).range([0, D.iw]);
    function px(i) { return n === 1 ? D.iw / 2 : x(i); }
    function Y(v) { return D.ih - (v / maxIdx) * D.ih; }
    var svg = d3.select(el).append("svg")
      .attr("viewBox", "0 0 " + D.W + " " + D.H).attr("width", D.W).attr("height", D.H)
      .style("display", "block").attr("role", "img");
    var g = svg.append("g").attr("transform", "translate(" + D.m.l + "," + D.m.t + ")");
    g.append("line").attr("x1", 0).attr("y1", D.ih).attr("x2", D.iw).attr("y2", D.ih).style("stroke", "var(--line2)").style("stroke-width", 1);
    [{ v: maxIdx, label: "P" + (maxIdx + 1) }, { v: 0, label: "P1" }].forEach(function (t) {
      g.append("text").attr("x", -6).attr("y", Y(t.v) + 3.5).attr("text-anchor", "end")
        .style("fill", "var(--faint)").style("font-family", "var(--mono)").style("font-size", "10px").text(t.label);
    });
    var line = d3.line().x(function (d, i) { return px(i); }).y(function (d) { return Y(d.y); }).curve(d3.curveStepAfter);
    g.append("path").datum(pts).attr("d", line).style("fill", "none").style("stroke", "var(--accent-2)").style("stroke-width", 1.8).style("stroke-linejoin", "round").style("stroke-linecap", "round");
    pts.forEach(function (p, i) {
      var col = p.result === "completed" ? "var(--good)" : (p.result === "missed" ? "var(--bad)" : "var(--faint)");
      g.append("circle").attr("cx", px(i)).attr("cy", Y(p.y)).attr("r", 3.2).style("fill", col);
    });
  }
  function drawSkillCharts() {
    if (typeof d3 === "undefined") return;
    var nodes = document.querySelectorAll(".ks-skillchart");
    if (!nodes.length) return;
    skillChartResizeBind();
    Array.prototype.forEach.call(nodes, function (el) {
      drawSkillChart(el, skillChartData(el.getAttribute("data-skill")));
    });
  }

  /* Export der eigenen Funktionen an den geteilten Namespace */
  KS.lineChart = lineChart;
  KS.barChart = barChart;
  KS.emptyChart = emptyChart;
  KS.plateLoaderSVG = plateLoaderSVG;
  KS.timerIcon = timerIcon;
  KS.xIcon = xIcon;
  KS.plateIcon = plateIcon;
  KS.plateHint = plateHint;
  KS.plateColor = plateColor;
  KS.plateChips = plateChips;
  KS.drawJourneyChart = drawJourneyChart;
  KS.drawExerciseCharts = drawExerciseCharts;
  KS.drawSkillCharts = drawSkillCharts;
  KS.skillChartData = skillChartData;
})();
