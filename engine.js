/* Fitness-System Engine v0.13 – reine Funktionen, framework-frei.
   Wird unverändert in die HTML-App eingebettet (global FSE). */
(function (root) {
  "use strict";

  // ---------- Helpers ----------
  function gcd(a, b) { a = Math.round(a * 100); b = Math.round(b * 100); while (b) { [a, b] = [b, a % b]; } return a / 100; }
  function plateGrid(plates) { // kleinster ladbarer Gesamtschritt = 2 * ggT der Scheiben
    if (!plates || !plates.length) return 1.25;
    let g = plates[0]; for (let i = 1; i < plates.length; i++) g = gcd(g, plates[i]); return g;
  }
  function round2(x) { return Math.round(x * 100) / 100; }

  // ---------- Ladbarkeit & Plate-Loader ----------
  // Nächstes ladbares Gesamtgewicht für eine Stange. roundDown = abrunden (Wiedereinstieg).
  function nearestLoadable(target, barWeight, plates, roundDown) {
    var g = plateGrid(plates);
    var step = 2 * g;                 // beide Seiten
    if (target <= barWeight) return barWeight;
    var k = (target - barWeight) / step;
    k = roundDown ? Math.floor(k + 1e-9) : Math.round(k);
    if (k < 0) k = 0;
    return round2(barWeight + k * step);
  }

  // Scheiben pro Seite (greedy, größte zuerst). total = Gesamtgewicht inkl. Stange.
  function plateBreakdown(total, barWeight, plates) {
    var perSide = round2((total - barWeight) / 2);
    if (perSide < 0) perSide = 0;
    var sorted = plates.slice().sort(function (a, b) { return b - a; });
    var out = [], rem = perSide;
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i]; var c = Math.floor((rem + 1e-9) / p);
      if (c > 0) { out.push({ plate: p, count: c }); rem = round2(rem - c * p); }
    }
    return { perSide: perSide, plates: out, remainder: round2(rem) }; // remainder>0 => nicht exakt ladbar
  }

  // ---------- 1RM ----------
  function brzycki(w, r) { return r >= 37 ? 0 : w * 36 / (37 - r); }
  function epley(w, r) { return w * (1 + r / 30); }
  function wathan(w, r) { return 100 * w / (48.8 + 53.8 * Math.exp(-0.075 * r)); }
  function oneRM(w, r, formula) {
    if (!w || !r) return 0;
    if (r === 1) return w;
    switch (formula) {
      case "brzycki": return brzycki(w, r);
      case "epley": return epley(w, r);
      case "wathan": return wathan(w, r);
      default: return (brzycki(w, r) + epley(w, r) + wathan(w, r)) / 3; // mean
    }
  }
  // Bestes 1RM aus sauberen Arbeitssätzen (done, kein warmup, kein Versagen).
  function best1RMFromSets(sets, formula) {
    var best = 0, lowConf = false;
    (sets || []).forEach(function (s) {
      if (s.type === "warmup" || !s.done || s.failed) return;
      var e = oneRM(s.weight, s.reps, formula);
      if (e > best) { best = e; lowConf = s.reps > 10; }
    });
    return { value: best ? round2(best) : null, lowConfidence: lowConf };
  }

  // ---------- Score <-> RIR <-> RPE ----------
  // Score 1..5  ~ RIR 4+..0  ~ RPE <=6..10
  var SCORE_MAP = {
    1: { rir: "4+", rpe: "≤6", label: "sehr leicht" },
    2: { rir: "3", rpe: "7", label: "leicht" },
    3: { rir: "2", rpe: "8", label: "im Ziel" },
    4: { rir: "1", rpe: "9", label: "im Ziel (hart)" },
    5: { rir: "0", rpe: "10", label: "Versagen" }
  };
  function scoreInfo(s) { return SCORE_MAP[s] || null; }

  // ---------- Soll-Ist ----------
  // metTarget: Zielwdh. erreicht UND Gewicht nicht reduziert UND nicht vorzeitig versagt.
  function metTarget(set) {
    if (set.type === "warmup") return null;
    var tr = set.targetReps, tw = set.targetWeight;
    if (tr == null || tw == null) return null;
    var reachedReps = set.reps >= tr;
    var notReduced = set.weight >= tw - 1e-9;
    var notFailedEarly = !(set.failed && set.reps < tr);
    return reachedReps && notReduced && notFailedEarly;
  }
  function hadDeviation(workSets) {
    return (workSets || []).some(function (s) {
      var mt = metTarget(s);
      return mt === false || s.adjusted === true;
    });
  }

  // ---------- Aufwärm-Generator (6.3) ----------
  // Adaptive Rampe: Stufenzahl folgt der Spanne Stange->Arbeit (Zielsprung ~18-22 %),
  // Endstufe ~85 % mit Puffer (mind. 1 Ladeschritt unter Arbeit), Reps sinken mit der Last
  // (Priming, keine Vorermüdung). isLift1 => kleinerer Sprung/mehr Stufen; isDeadlift => weniger Volumen.
  function generateWarmup(workWeight, barWeight, plates, opts) {
    opts = opts || {};
    var isLift1 = !!opts.isLift1, isDeadlift = !!opts.isDeadlift;
    var sets = [];
    if (!(workWeight > barWeight)) return sets;       // Arbeit <= Stange: kein Aufwärmen
    var step = 2 * plateGrid(plates);                 // kleinster Ladeschritt (beide Seiten)
    var steps = step > 0 ? Math.round((workWeight - barWeight) / step) : 0;

    // 1) leere Stange – Bewegungsvorbereitung, niedrige Reps
    sets.push({ reps: 5, weight: barWeight, type: "warmup", done: false });
    if (steps <= 1) return sets;                      // winziger Abstand: Stange genügt

    // 2) Endstufe ~85 % des Arbeitsgewichts, mind. einen Ladeschritt darunter
    var top = nearestLoadable(workWeight * 0.85, barWeight, plates, false);
    var maxTop = round2(workWeight - step);
    if (top > maxTop) top = maxTop;
    if (top <= barWeight) return sets;                // kein Platz für Zwischenstufen

    // 3) Stufenzahl aus der Spanne: Zielsprung ~18 % (LIFT1, gründlicher) bzw. 22 %
    //    des Arbeitsgewichts pro Stufe; 1..4 Zwischenstufen
    var perStep = (isLift1 ? 0.18 : 0.22) * workWeight;
    var nMid = Math.max(1, Math.min(4, Math.round((top - barWeight) / perStep)));

    // 4) gleichmäßig zwischen Stange und Endstufe verteilen, Reps nach relativer Last
    for (var i = 1; i <= nMid; i++) {
      var tgt = barWeight + (top - barWeight) * (i / nMid);
      var ld = nearestLoadable(tgt, barWeight, plates, false);
      if (ld <= barWeight || ld >= workWeight) continue;
      var last = sets[sets.length - 1];
      if (last && Math.abs(last.weight - ld) < 1e-9) continue; // Dubletten vermeiden
      var p = ld / workWeight;
      var reps = p < 0.6 ? 5 : p < 0.75 ? 3 : 2;
      if (isDeadlift && reps > 3) reps = 3;           // Deadlift: weniger Aufwärmvolumen
      sets.push({ reps: reps, weight: ld, type: "warmup", done: false });
    }
    return sets;
  }

  // ---------- Gewichtsvorschlag (6.2) ----------
  // ex: { workWeight, repRange:[min,max], targetScore, barId }
  // lastEntry: vorheriger Eintrag derselben Übung mit sets[] (Arbeitssätze).
  // settings: { rmFormula, step, ... }; bar: Stangenobjekt; plates: number[]
  // returns { weight, targetReps, note, decision }
  function suggestWeight(ex, lastEntry, opts) {
    opts = opts || {};
    var bar = opts.bar || { weight: 20 };
    var plates = opts.plates || [1.25, 2.5, 5, 10, 15, 20, 25];
    var range = ex.repRange || [8, 12];
    var tScore = ex.targetScore || 3;
    var W = ex.workWeight || bar.weight;
    var reentry = !!opts.reentry;

    function ld(x, down) { return nearestLoadable(x, bar.weight, plates, !!down); }

    if (reentry) {
      // Wiedereinstieg: nur erhöhen bei Score <= 3 und Technik ok; abrunden.
      var wsR = workSets(lastEntry);
      var okScore = wsR.length ? avg(wsR.map(function (s) { return s.score || 3; })) <= 3 : true;
      var techOk = !wsR.some(function (s) { return s.painFlag; });
      if (wsR.length && okScore && techOk) {
        return { weight: ld(W + 2.5, true), targetReps: range[0], decision: "increase", note: "Wiedereinstieg: vorsichtig +Schritt, abgerundet" };
      }
      return { weight: ld(W, true), targetReps: range[0], decision: "hold", note: "Wiedereinstieg: Gewicht halten" };
    }

    var ws = workSets(lastEntry);
    if (!ws.length) {
      return { weight: ld(W, false), targetReps: range[1], decision: "hold", note: "keine Vordaten – Startgewicht halten" };
    }

    var allMet = ws.every(function (s) { return metTarget(s) === true; });
    var anyFailed = ws.some(function (s) { return s.failed; });
    var anyReduced = ws.some(function (s) { return s.targetWeight != null && s.weight < s.targetWeight - 1e-9; });
    var avgScore = avg(ws.map(function (s) { return s.score || tScore; }));
    var maxReps = Math.max.apply(null, ws.map(function (s) { return s.reps || 0; }));
    var minReps = Math.min.apply(null, ws.map(function (s) { return s.reps || 0; }));

    // über Ziel-Score / Versagen / Last-Reduktion -> halten oder senken
    if (anyFailed || anyReduced || avgScore > tScore + 0.5) {
      if (avgScore >= 4.5 || anyReduced) {
        return { weight: ld(W - 2.5, true), targetReps: range[1], decision: "decrease", note: "Versagen/Reduktion oder zu hart – Gewicht senken" };
      }
      return { weight: ld(W, false), targetReps: range[1], decision: "hold", note: "hart/verfehlt – Gewicht halten" };
    }

    // alles erreicht und leichter als Ziel -> doppelte Progression
    if (allMet && avgScore < tScore) {
      if (minReps >= range[1]) {
        // oberes Repband erreicht -> Gewicht hoch, Reps zurück auf Minimum
        return { weight: ld(W + 2.5, false), targetReps: range[0], decision: "increase", note: "Repband oben erreicht – Gewicht +Schritt, Reps zurücksetzen" };
      }
      // sonst zuerst Wiederholungen steigern
      return { weight: ld(W, false), targetReps: Math.min(range[1], maxReps + 1), decision: "increase-reps", note: "leichter als Ziel – Wiederholungen steigern (Gewicht gleich)" };
    }

    // im Ziel, aber Reps nicht voll oder metTarget false -> halten
    return { weight: ld(W, false), targetReps: range[1], decision: "hold", note: "im Ziel – Gewicht halten, Repband ausreizen" };
  }

  function workSets(entry) {
    if (!entry || !entry.sets) return [];
    return entry.sets.filter(function (s) { return s.type !== "warmup"; });
  }
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }

  // ---------- Workout-Auswahl: Suitability (6.1) ----------
  // ctx: { now (ms), lastByExercise:{exId: ms}, soreness:{legs,upper_body,overall}, weekCounts:{exId:n}, phase, freqTarget }
  // template: { id, lift1, lift2, core }  exercise lookup via opts.exMap
  function suitability(template, ctx, opts) {
    opts = opts || {};
    var exMap = opts.exMap || {};
    var now = ctx.now || Date.now();
    var H = 3600 * 1000;
    var score = 0, excluded = false, reasons = [];

    var ids = (Array.isArray(template.items)
      ? template.items.map(function (it) { return (typeof it === "string") ? it : (it && it.exerciseId); })
      : [template.lift1, template.lift2, template.core]
    ).filter(Boolean);

    // Recency: längster Abstand seit letztem Einsatz der enthaltenen Lifts
    var recencyDays = 999;
    ids.forEach(function (id) {
      var last = ctx.lastByExercise ? ctx.lastByExercise[id] : null;
      if (last != null) recencyDays = Math.min(recencyDays, (now - last) / (24 * H));
    });
    if (recencyDays === 999) { score += 3; reasons.push("nie trainiert (+3)"); }
    else { var rc = Math.min(3, recencyDays); score += rc; reasons.push("Recency +" + round2(rc)); }

    // Erholung: Squat<48h, Deadlift<72h
    ids.forEach(function (id) {
      var ex = exMap[id]; if (!ex) return;
      var last = ctx.lastByExercise ? ctx.lastByExercise[id] : null;
      if (last == null) return;
      var hrs = (now - last) / H;
      var win = ex.recoveryHours || (ex.muscleGroups && ex.muscleGroups.indexOf("legs") >= 0 ? 48 : 48);
      if (/deadlift/i.test(ex.id) || /deadlift/i.test(ex.name || "")) win = 72;
      if (hrs < win) { score -= 2; reasons.push((ex.name || id) + " unausgeruht (-2)"); }
    });

    // Muskelkater nach Region: >=2 Abzug, =3 Ausschluss
    var sore = ctx.soreness || {};
    ids.forEach(function (id) {
      var ex = exMap[id]; if (!ex) return;
      var regions = mapMusclesToRegions(ex.muscleGroups || []);
      regions.forEach(function (reg) {
        var v = sore[reg] || 0;
        if (v >= 3) { excluded = true; reasons.push(reg + " Kater=3 (Ausschluss)"); }
        else if (v >= 2) { score -= 2; reasons.push(reg + " Kater=2 (-2)"); }
      });
    });

    // Wochenbalance: selten trainierte Lifts bevorzugen
    var wc = ctx.weekCounts || {};
    ids.forEach(function (id) {
      var n = wc[id] || 0;
      var b = Math.max(0, 1.5 - n); // 0x -> +1.5, 1x -> +0.5, 2x -> 0
      score += b;
    });
    reasons.push("Wochenbalance berücksichtigt");

    // Phasen-Fit (einfach: passt Profil zur Phase)
    if (ctx.phase && ctx.phase.focus) {
      // hier neutral; Erweiterung später
      score += 0.5; reasons.push("Phasen-Fit +0.5");
    }

    return { score: round2(score), excluded: excluded, reasons: reasons };
  }

  function mapMusclesToRegions(mg) {
    var set = {};
    mg.forEach(function (m) {
      if (["legs", "quads", "hamstrings", "glutes", "calves"].indexOf(m) >= 0) set["legs"] = 1;
      else set["upper_body"] = 1;
    });
    return Object.keys(set);
  }

  // ---------- Volumensteuerung & Deload (6.4) ----------
  // phase: { setsStart, setsEnd, weeks, deloadWeek }
  function volumeForWeek(phase, weekIndex, recoveryGreen) {
    var s0 = phase.setsStart || 2, s1 = phase.setsEnd || 4, weeks = Math.max(1, phase.weeks || 4);
    var base;
    if (phase.deloadWeek && weekIndex === phase.deloadWeek) {
      var prev = rampSets(s0, s1, Math.max(0, weekIndex - 1), weeks);
      return Math.max(s0, Math.round(prev * 0.75)); // -25 %
    }
    base = rampSets(s0, s1, weekIndex, weeks);
    if (!recoveryGreen) base = Math.max(s0, base - 1); // bei roten Markern nicht weiter rampen
    return base;
  }
  function rampSets(s0, s1, weekIndex, weeks) {
    if (weeks <= 1) return s1;
    var frac = Math.min(1, weekIndex / (weeks - 1));
    return Math.round(s0 + (s1 - s0) * frac);
  }
  // markers: { perfDropTwoSessions:bool, soreness:0-3, readiness:1-5 }
  function deloadCheck(markers) {
    var tipping = 0, why = [];
    if (markers.perfDropTwoSessions) { tipping++; why.push("Leistungsabfall/metTarget=false über 2 Einheiten"); }
    if ((markers.soreness || 0) >= 2) { tipping++; why.push("Muskelkater ≥ 2"); }
    if ((markers.readiness || 5) <= 2) { tipping++; why.push("niedrige Readiness"); }
    return { deload: tipping >= 2, tipping: tipping, why: why };
  }

  // ---------- Erholungs-Check (6.5) ----------
  // slotHoursOk: Zeitfenster erfüllt; bodyOk: Körperzustand erlaubt. Zustand schlägt Fenster.
  function recoveryCheck(slotHoursOk, bodyState) {
    var bs = bodyState || {};
    var pain = bs.pain && Object.keys(bs.pain).some(function (k) { return bs.pain[k]; });
    var sore = Math.max(bs.legs || 0, bs.upper_body || 0, bs.overall || 0);
    var bodyOk = !(sore >= 3); // =3 blockt
    var ready = (bs.readiness || 3) >= 2;
    var ok = slotHoursOk && bodyOk && ready;
    return { ok: ok, slotHoursOk: slotHoursOk, bodyOk: bodyOk, painWarn: !!pain };
  }

  var API = {
    gcd: gcd, plateGrid: plateGrid, round2: round2,
    nearestLoadable: nearestLoadable, plateBreakdown: plateBreakdown,
    oneRM: oneRM, best1RMFromSets: best1RMFromSets,
    scoreInfo: scoreInfo, SCORE_MAP: SCORE_MAP,
    metTarget: metTarget, hadDeviation: hadDeviation,
    generateWarmup: generateWarmup, suggestWeight: suggestWeight,
    suitability: suitability, mapMusclesToRegions: mapMusclesToRegions,
    volumeForWeek: volumeForWeek, rampSets: rampSets, deloadCheck: deloadCheck,
    recoveryCheck: recoveryCheck, workSets: workSets
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.FSE = API;
})(typeof window !== "undefined" ? window : globalThis);
