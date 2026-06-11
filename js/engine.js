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

  // ---------- Phasenwechsel: Arbeitsgewicht auf neue Repband-Zone (6.6) ----------
  // Beim Wechsel des Ziel-Repbands (Phasenuebergang) wird das Arbeitsgewicht EINMALIG
  // an die neue Intensitaetszone angepasst, statt nur in Schritten nachzulaufen. Reine
  // Rechnung: kennt weder DB noch Phase, bekommt nur ein geschaetztes 1RM und die Zone.

  // Invertierte Epley-Naeherung: Last fuer 'reps' saubere Wiederholungen bei gegebenem
  // 1RM. Epley, weil als einzige der Formeln geschlossen invertierbar; das gepufferte,
  // abgerundete Ergebnis macht die Wahl der Formel unkritisch. reps=1 => 1RM selbst.
  function loadForReps(oneRMv, reps) {
    if (!(oneRMv > 0) || !(reps > 0)) return 0;
    if (reps <= 1) return oneRMv;
    return oneRMv / (1 + reps / 30);
  }

  // Zielarbeitsgewicht beim Phasenwechsel.
  //   est1RM   : geschaetztes 1RM aus der letzten sauberen Session (oder null)
  //   repRange : [min,max] der NEUEN Phase
  //   opts     : { bar, plates, currentWeight, bufferReps, maxUpPct }
  // Verletzungsbewusst & asymmetrisch:
  //   - Ankerpunkt ist das OBERE (leichtere) Zonenende plus RIR-Puffer (bufferReps,
  //     Default 2 ~ 2 RIR) -> bewusst konservative, nie maximale Last.
  //   - Immer auf ladbares Gewicht ABGERUNDET (zusaetzlicher Sicherheitspuffer).
  //   - Nach UNTEN (Ziel leichter als aktuell, z.B. Kraft -> Hypertrophie) direkt auf
  //     das Zielgewicht: die zu schwere Altlast wird sofort entschaerft.
  //   - Nach OBEN (Ziel schwerer, z.B. Hypertrophie -> Kraft) auf das Zielgewicht, aber
  //     prozentual gedeckelt (maxUpPct, Default 0.12) gegen eine zu hohe 1RM-Schaetzung;
  //     den Rest holt die Doppelprogression Session fuer Session.
  //   - Ohne 1RM bleibt das aktuelle Gewicht unangetastet (decision "hold").
  function workWeightForPhase(est1RM, repRange, opts) {
    opts = opts || {};
    var bar = opts.bar || { weight: 20 };
    var plates = opts.plates || [1.25, 2.5, 5, 10, 15, 20, 25];
    var cur = opts.currentWeight || bar.weight;
    var buffer = opts.bufferReps == null ? 2 : opts.bufferReps;
    var maxUp = opts.maxUpPct == null ? 0.12 : opts.maxUpPct;
    var range = repRange || [8, 12];
    if (!(est1RM > 0)) {
      return { weight: cur, decision: "hold", note: "kein 1RM – Gewicht halten" };
    }
    var reps = (range[1] || range[0] || 8) + buffer;          // oberes, leichteres Bandende + RIR
    var target = nearestLoadable(loadForReps(est1RM, reps), bar.weight, plates, true); // abrunden
    if (target >= cur) {
      var cap = nearestLoadable(cur * (1 + maxUp), bar.weight, plates, true);
      if (target > cap) target = cap;
      if (target <= cur) return { weight: cur, decision: "hold", note: "Phasenwechsel: bereits passend, Gewicht halten" };
      return { weight: target, decision: "raise", note: "Phasenwechsel: Last gepuffert auf neue Zone angehoben" };
    }
    return { weight: target, decision: "lower", note: "Phasenwechsel: zu schwere Last auf leichtere Zone gesenkt" };
  }

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

    // Phasen-Fit: in kraftorientierten Phasen (strength/power/test) zaehlt jeder
    // schwere Hauptlift (kind "main") extra -> Templates mit mehr Grundübungen
    // ranken hoeher und werden oefter empfohlen. Hoehere Frequenz pro Hauptlift
    // ist evidenzbasiert vorteilhaft fuer Maximalkraft. Erholungsfenster (-2) und
    // Kater-Ausschluss stehen im Score darueber und bleiben das Geländer.
    // Uebrige Phasen (reentry/hypertrophy/endurance/maintenance) bleiben neutral.
    if (ctx.phase && ctx.phase.focus) {
      var pf = ctx.phase.focus;
      if (pf === "strength" || pf === "power" || pf === "test") {
        var mains = 0;
        ids.forEach(function (id) {
          var exo = exMap[id];
          if (exo && exo.kind === "main") mains++;
        });
        var pb = round2(mains * 0.6);
        score += pb; reasons.push("Kraftphase: " + mains + " Hauptlift(s) +" + pb);
      } else {
        score += 0.5; reasons.push("Phasen-Fit +0.5");
      }
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
  // deloadWeek ist 1-basiert (Wochennummer der Phase, z. B. 6 = sechste Woche);
  // weekIndex ist 0-basiert (currentWeek - 1), daher Vergleich gegen deloadWeek - 1.
  function volumeForWeek(phase, weekIndex, recoveryGreen) {
    var s0 = phase.setsStart || 2, s1 = phase.setsEnd || 4, weeks = Math.max(1, phase.weeks || 4);
    var base;
    if (phase.deloadWeek && weekIndex === phase.deloadWeek - 1) {
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

  // ---------- Skills (reine Funktionen, keine DB-Kenntnis) ----------
  // Erfuellt EIN Satz sein Ziel? Kapselt das Urteil je Metrik (erweiterbare Naht).
  // v1: reps/duration mit skalarem target. Spaetere Metriken (distance/
  // distance_time mit Objekt-target) bekommen hier einen eigenen Fall.
  function skillSetMet(metric, target, set) {
    if (!set || !set.done) return false;
    switch (metric) {
      case "reps":
      case "duration":
        return Number(set.value) >= Number(target);
      default:
        return false; // unbekannte Metrik: defensiv nicht erfuellt
    }
  }

  // Wie ist die Skill-Session ausgegangen? Bewertet ALLE Uebungen der Phase.
  // phaseExercises: Phasen-Definition ({metric,target,sets,...}); workExercises:
  // Live-Uebungen ({sets:[{value,done}]}), index-gleich. Robust gegen bereits
  // auf done-Saetze gefilterte Eingaben.
  //   "skipped"   : kein Satz in keiner Uebung done
  //   "completed" : alle geplanten Saetze ALLER Uebungen done und im Ziel
  //   "missed"    : versucht (>=1 Satz done), aber nicht alles erfuellt
  function skillSessionResult(phaseExercises, workExercises) {
    phaseExercises = phaseExercises || [];
    workExercises = workExercises || [];
    var anyDone = false, allComplete = true;
    for (var i = 0; i < phaseExercises.length; i++) {
      var pe = phaseExercises[i] || {};
      var we = workExercises[i] || {};
      var sets = we.sets || [];
      var planned = pe.sets || 0;
      var done = sets.filter(function (s) { return s && s.done; });
      if (done.length) anyDone = true;
      var met = done.filter(function (s) { return skillSetMet(pe.metric, pe.target, s); }).length;
      if (!(done.length === planned && met === planned)) allComplete = false;
    }
    if (!anyDone) return "skipped";
    return allComplete ? "completed" : "missed";
  }

  // Beratung fuer einen Skill (rein, ohne DB). Auch fuer das Auswahl-Tor.
  // ownedEquipmentIds: IDs der aktiven Geraete. missingEquipment liefert IDs;
  // die App loest Labels ueber das Inventar auf.
  function skillAdvice(skillDef, progress, ownedEquipmentIds) {
    var phases = (skillDef && skillDef.phases) || [];
    var prog = progress || {};
    var owned = ownedEquipmentIds || [];
    var idx = Math.max(0, Math.min(prog.currentPhase || 0, phases.length - 1));
    var phase = phases[idx] || null;
    var req = (phase && phase.equipment) || [];
    var missing = req.filter(function (id) { return owned.indexOf(id) < 0; });
    var consec = prog.consecutiveCount || 0;
    var need = (phase && phase.consecutiveSessions) || 0;
    var mastered = !!prog.mastered;
    return {
      phase: phase,
      phaseIndex: idx,
      exercises: (phase && phase.exercises) || [],
      equipmentMissing: missing.length > 0,
      missingEquipment: missing,
      readyToAdvance: !mastered && need > 0 && (consec + 1) >= need,
      mastered: mastered
    };
  }

  var API = {
    gcd: gcd, plateGrid: plateGrid, round2: round2,
    nearestLoadable: nearestLoadable, plateBreakdown: plateBreakdown,
    oneRM: oneRM, best1RMFromSets: best1RMFromSets,
    scoreInfo: scoreInfo, SCORE_MAP: SCORE_MAP,
    metTarget: metTarget, hadDeviation: hadDeviation,
    generateWarmup: generateWarmup, suggestWeight: suggestWeight,
    loadForReps: loadForReps, workWeightForPhase: workWeightForPhase,
    suitability: suitability, mapMusclesToRegions: mapMusclesToRegions,
    volumeForWeek: volumeForWeek, rampSets: rampSets, deloadCheck: deloadCheck,
    recoveryCheck: recoveryCheck, workSets: workSets,
    skillSetMet: skillSetMet, skillSessionResult: skillSessionResult, skillAdvice: skillAdvice
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.FSE = API;
})(typeof window !== "undefined" ? window : globalThis);
