/* Kraftschmiede – live.js (Schema 0.14). Vanilla JS, framework-frei.
   Live-Session-Ablauf, Pausen-Timer, Audio/Vibration, Rest-Bar sowie
   Start-/Ende-Dialoge. Aus app.js ausgelagert.
   Greift ueber window.KS auf geteilte Helfer und State zu: db() (Getter,
   bleibt nach setDB korrekt), KS.UI, sowie Wrapper auf app.js-/charts.js-/
   data.js-Funktionen. Timer-Handles (clockTimer/audioCtx/restTimer) sind
   modul-intern. Setzt window.FSE (engine.js) voraus. */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});
  var E = window.FSE;

  /* duenne Wrapper auf geteilte Funktionen (window.KS); db() ist der State-Getter */
  function db() { return KS.db(); }
  function activeJourney() { return KS.activeJourney.apply(null, arguments); }
  function barById() { return KS.barById.apply(null, arguments); }
  function currentPhase() { return KS.currentPhase.apply(null, arguments); }
  function entryBar() { return KS.entryBar.apply(null, arguments); }
  function esc() { return KS.esc.apply(null, arguments); }
  function exById() { return KS.exById.apply(null, arguments); }
  function firstBar() { return KS.firstBar.apply(null, arguments); }
  function fmtNum() { return KS.fmtNum.apply(null, arguments); }
  function fmtW() { return KS.fmtW.apply(null, arguments); }
  function latestBody() { return KS.latestBody.apply(null, arguments); }
  function pad() { return KS.pad.apply(null, arguments); }
  function persist() { return KS.persist.apply(null, arguments); }
  function phase() { return KS.phase.apply(null, arguments); }
  function plateHint() { return KS.plateHint.apply(null, arguments); }
  function plateIcon() { return KS.plateIcon.apply(null, arguments); }
  function render() { return KS.render.apply(null, arguments); }
  function restAdvice() { return KS.restAdvice.apply(null, arguments); }
  function scrollToTop() { return KS.scrollToTop.apply(null, arguments); }
  function snapshotBody() { return KS.snapshotBody.apply(null, arguments); }
  function timerIcon() { return KS.timerIcon.apply(null, arguments); }
  function today() { return KS.today.apply(null, arguments); }
  function todayBody() { return KS.todayBody.apply(null, arguments); }
  function tplById() { return KS.tplById.apply(null, arguments); }
  function tplItems() { return KS.tplItems.apply(null, arguments); }
  function xIcon() { return KS.xIcon.apply(null, arguments); }

  /* =========================================================
     Live-Session, Timer, Audio, Rest-Bar, Start-/Ende-Dialoge
     ========================================================= */
  function restBanner() {
    var a = restAdvice();
    if (a.level === "unknown") {
      return '<div class="rest-card unknown"><div class="rc-main"><strong>Körperzustand heute noch nicht erfasst</strong><span>Für eine passende Empfehlung kurz im Körper-Tab eintragen.</span></div><button class="btn" data-action="tab" data-tab="body">Körperzustand erfassen</button></div>';
    }
    if (a.level === "rest") {
      return '<div class="rest-card rest"><div class="rc-main"><strong>Rest-Tag empfohlen</strong><span>' + esc(a.reasons.join(" · ")) + '. Heute lieber Erholung oder lockere Mobility. Du kannst trotzdem trainieren – dann konservativ.</span></div></div>';
    }
    if (a.level === "caution") {
      return '<div class="rest-card caution"><div class="rc-main"><strong>Vorsicht – reduziert trainieren</strong><span>' + esc(a.reasons.join(" · ")) + '. Volumen/Intensität ggf. zurücknehmen.</span></div></div>';
    }
    return '<div class="rest-card ok"><div class="rc-main"><strong>Bereit fürs Training</strong><span>Körperzustand grün.</span></div></div>';
  }

  /* Trainings-Uhr: zaehlt aus startedAt hoch. Anzeige wird immer aus
     (Date.now() - startedAt) berechnet, daher robust gegen Tab-Wechsel und
     Hintergrund-Drosselung. Das laufende Workout liegt in KS.UI.live. */
  var clockTimer = null;
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = sec % 60;
    return (h > 0 ? h + ":" + pad(m) : "" + m) + ":" + pad(ss);
  }
  function updateClock() {
    var el = document.getElementById("live-clock");
    if (!el || !KS.UI.live || !KS.UI.live.startedAt) { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } return; }
    el.textContent = fmtDur((Date.now() - KS.UI.live.startedAt) / 1000);
  }
  function manageClock() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    if (KS.UI.tab === "training" && KS.UI.live && KS.UI.live.startedAt) { updateClock(); clockTimer = setInterval(updateClock, 1000); }
  }

  /* ---------------------------------------------------------
     Schritt 2: Satz-Pause-Timer, Signal (Ton + Vibration),
     Aktiv-Markierung des naechsten Satzes. Der Pausen-Balken
     (#ks-rest-bar) lebt im body und ueberlebt App-Re-Renders.
     Countdown ueber absoluten Zielzeitstempel -> robust gegen
     Hintergrund/Tab-Wechsel. Edit (-15/+15) gilt nur fuer den
     laufenden Durchgang und aendert die Defaults nicht. */
  var audioCtx = null, restTimer = null;
  function ensureAudio() {
    try {
      if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
    } catch (e) {}
  }
  function playBeep() {
    var T = db().settings.timers || {}; if (!T.sound) return;
    try {
      ensureAudio(); if (!audioCtx) return;
      var t0 = audioCtx.currentTime;
      [0, 0.2].forEach(function (off) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(880, t0 + off);
        g.gain.setValueAtTime(0.0001, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.3, t0 + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.16);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t0 + off); o.stop(t0 + off + 0.18);
      });
    } catch (e) {}
  }
  function buzz() {
    var T = db().settings.timers || {}; if (!T.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
  }
  // Kurzer, moderner UI-Klick beim Umschalten einer Erledigt-Checkbox.
  // "An" klingt heller/aufsteigend, "Aus" tiefer/abfallend. Plus kurze
  // Vibration (Android; iOS Safari unterstuetzt navigator.vibrate nicht).
  // Folgt den Ton-/Vibration-Schaltern in den Einstellungen.
  function clickTick(on) {
    var T = db().settings.timers || {};
    if (T.sound) {
      try {
        ensureAudio();
        if (audioCtx) {
          var t0 = audioCtx.currentTime;
          var o = audioCtx.createOscillator(), g = audioCtx.createGain();
          var f = on ? 540 : 400;
          o.type = "triangle";
          o.frequency.setValueAtTime(f, t0);
          o.frequency.exponentialRampToValueAtTime(on ? f * 1.7 : f * 0.6, t0 + 0.05);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(t0); o.stop(t0 + 0.1);
        }
      } catch (e) {}
    }
    if (T.vibrate) { try { if (navigator.vibrate) navigator.vibrate(on ? 18 : 11); } catch (e) {} }
  }
  function ensureRestBar() {
    if (document.getElementById("ks-rest-bar")) return;
    var bar = document.createElement("div");
    bar.id = "ks-rest-bar"; bar.className = "ks-rest-bar";
    bar.innerHTML = '<span class="rb-side" aria-hidden="true"></span>'
      + '<div class="rb-center">'
      + '<button class="btn tiny ghost rb-step" data-action="rest-minus">\u221215</button>'
      + '<span class="rb-time">0:00</span>'
      + '<button class="btn tiny ghost rb-step" data-action="rest-plus">+15</button>'
      + '</div>'
      + '<span class="rb-side rb-side-r">'
      + '<button class="icon-btn rb-skip" data-action="rest-skip" title="überspringen" aria-label="Pause überspringen">' + xIcon() + '</button>'
      + '</span>';
    document.body.appendChild(bar);
  }
  function startRestTick() { if (restTimer) return; restTimer = setInterval(restTick, 500); }
  function stopRestTick() { if (restTimer) { clearInterval(restTimer); restTimer = null; } }
  function restTick() {
    var r = KS.UI.live && KS.UI.live.rest; var bar = document.getElementById("ks-rest-bar");
    if (!r || !bar) { stopRestTick(); return; }
    var remain = Math.round((r.endsAt - Date.now()) / 1000);
    var timeEl = bar.querySelector(".rb-time");
    if (remain <= 0) {
      if (timeEl) timeEl.textContent = "0:00";
      bar.classList.add("done");
      if (!r.fired) { r.fired = true; if (remain > -3) { playBeep(); buzz(); } }
      stopRestTick();
    } else {
      if (timeEl) timeEl.textContent = fmtDur(remain);
      bar.classList.remove("done");
    }
  }
  function syncRestBar() {
    ensureRestBar();
    var bar = document.getElementById("ks-rest-bar"); if (!bar) return;
    var active = !!(KS.UI.tab === "training" && KS.UI.live && KS.UI.live.rest);
    if (!active) { bar.classList.remove("show", "done"); stopRestTick(); return; }
    bar.classList.add("show"); restTick(); startRestTick();
  }
  function startRest(type, sec, ei, si) {
    if (!KS.UI.live) return;
    sec = Math.max(0, parseInt(sec, 10) || 0); if (!sec) return;
    KS.UI.live.rest = { type: type, baseSec: sec, endsAt: Date.now() + sec * 1000, ei: ei, si: si, fired: false };
    syncRestBar();
  }
  function adjustRest(delta) {
    var r = KS.UI.live && KS.UI.live.rest; if (!r) return;
    r.endsAt = Math.max(Date.now(), r.endsAt) + delta * 1000;
    if (r.endsAt < Date.now()) r.endsAt = Date.now();
    if (r.endsAt - Date.now() > 0) r.fired = false;
    ensureAudio();
    var bar = document.getElementById("ks-rest-bar"); if (bar) bar.classList.remove("done");
    restTick(); startRestTick();
  }
  function skipRest() {
    if (KS.UI.live) KS.UI.live.rest = null;
    stopRestTick();
    var bar = document.getElementById("ks-rest-bar"); if (bar) bar.classList.remove("show", "done");
  }
  function toggleTimers() {
    var T = db().settings.timers = db().settings.timers || {};
    T.autoStart = !T.autoStart;
    persist();
    if (!T.autoStart) skipRest();
    var btn = document.querySelector(".timer-toggle");
    if (btn) { btn.classList.toggle("on", !!T.autoStart); btn.setAttribute("aria-pressed", T.autoStart ? "true" : "false"); }
  }

  /* =========================================================
     RestTimer – der Pausen-Timer als Baustein. Buendelt den Pausen-Balken
     (#ks-rest-bar), den Countdown und die Signale (Ton + Vibration) hinter
     einem kleinen Interface. Die internen Helfer (ensureRestBar, restTick,
     playBeep, buzz, clickTick ...) bleiben privat in live.js und werden nicht
     mehr einzeln veroeffentlicht. Nach aussen sichtbar ist nur RestTimer.
     ========================================================= */
  var RestTimer = {
    adjust: adjustRest,   // (delta) – laufende Pause um +/- Sekunden aendern
    skip: skipRest,       // Pause beenden/ueberspringen
    syncBar: syncRestBar, // Balken-Sichtbarkeit nach jedem Render abgleichen
    toggle: toggleTimers  // Auto-Pausen ein/aus (Einstellungs-Schalter)
  };
  function syncActiveSet() {
    var root = document.getElementById("app"); if (!root) return;
    root.querySelectorAll(".set-row.work.active-next").forEach(function (r) { r.classList.remove("active-next"); });
    var a = KS.UI.live && KS.UI.live.activeSet; if (!a) return;
    var en = KS.UI.live.entries[a.ei]; var st = en && en.sets[a.si];
    if (!st || st.done) return;
    var row = root.querySelector('.set-row.work[data-ei="' + a.ei + '"][data-si="' + a.si + '"]');
    if (row) row.classList.add("active-next");
  }
  function firstOpenSet(en) { for (var i = 0; i < en.sets.length; i++) { if (!en.sets[i].done) return i; } return -1; }
  function nextOpenExercise(fromEi) {
    for (var i = fromEi + 1; i < KS.UI.live.entries.length; i++) { if (firstOpenSet(KS.UI.live.entries[i]) >= 0) return i; }
    return -1;
  }
  function onSetCompleted(ei, si) {
    ensureAudio();
    var en = KS.UI.live.entries[ei]; var T = db().settings.timers || {};
    var openSi = firstOpenSet(en);
    if (openSi >= 0) {
      // Uebung noch nicht fertig -> Satz-Pause auf den naechsten offenen Satz
      KS.UI.live.activeSet = { ei: ei, si: openSi };
      syncActiveSet();
      if (T.autoStart) startRest("set", T.setRestSec, ei, openSi);
      return;
    }
    // letzter Satz der Uebung -> naechste Uebung mit offenen Saetzen
    var nextEi = nextOpenExercise(ei);
    if (nextEi >= 0) {
      var firstSi = firstOpenSet(KS.UI.live.entries[nextEi]); if (firstSi < 0) firstSi = 0;
      KS.UI.live.activeSet = { ei: nextEi, si: firstSi };
      syncActiveSet();
      if (T.autoStart) startRest("exercise", T.exerciseRestSec, nextEi, firstSi);
    } else {
      // letzter Satz der letzten Uebung -> kein Timer, Markierung weg, Balken schliessen
      KS.UI.live.activeSet = null;
      syncActiveSet();
      skipRest();
    }
  }

  function buildLive(templateId) {
    var t = tplById(templateId); var phase = currentPhase(); var j = activeJourney();
    var entries = tplItems(t).map(function (it, idx) {
      var id = it.exerciseId;
      var exo = exById(id);
      var sug = KS.Coach.suggestionFor(exo, phase);
      // Core-Uebungen fix 3 Saetze; Kraftuebungen folgen der Phasen-Satzrampe.
      var setN = exo.profile === "core" ? 3 : KS.Coach.plannedSets();
      var startBarId = (firstBar() || {}).id || exo.barId;
      var warm = KS.Coach.warmupFor(exo, sug.weight, barById(startBarId), idx === 0);
      var planned = []; for (var k = 0; k < setN; k++) planned.push({ reps: sug.targetReps, weight: sug.weight, targetScore: exo.targetScore });
      var sets = planned.map(function (p) {
        return { reps: p.reps, weight: p.weight, score: exo.targetScore, failed: false, done: false, targetReps: p.reps, targetWeight: p.weight, adjusted: false, adjustNote: "" };
      });
      return { exerciseId: id, barId: startBarId, warmupSets: warm, plannedSets: planned, sets: sets, suggestion: sug, tested1RM: null };
    });
    var b = latestBody();
    return {
      id: "s_" + today().replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000),
      date: today(), journeyId: j ? j.id : null, phaseId: phase ? phase.id : null, templateId: templateId,
      status: "live", startedAt: Date.now(), activeSet: { ei: 0, si: 0 }, generalWarmup: { done: false, minutes: 7, mode: "bike" },
      entries: entries, body: { legs: b.legs || 0, upper_body: b.upper_body || 0, overall: b.overall || 0, pain: {}, readiness: b.readiness || 3, notes: "" }
    };
  }

  function liveSession() {
    var s = KS.UI.live; var t = tplById(s.templateId);
    if (!s.startedAt) s.startedAt = Date.now();
    var gw = s.generalWarmup;
    var timersOn = !!((db().settings.timers || {}).autoStart);
    var html = '<div class="live-head">'
      + '<div class="live-head-l"><div class="section-title">Training · Workout ' + esc(t.name) + '</div></div>'
      + '<div class="live-head-r"><span class="live-clock" id="live-clock" title="Trainingsdauer">' + fmtDur((Date.now() - s.startedAt) / 1000) + '</span>'
      + '<button class="icon-btn timer-toggle' + (timersOn ? ' on' : '') + '" data-action="toggle-timers" aria-pressed="' + (timersOn ? 'true' : 'false') + '" title="Pausen-Timer ein/aus" aria-label="Pausen-Timer ein- oder ausschalten">' + timerIcon() + '</button>'
      + '<button class="btn end-btn small" data-action="finish-workout">Beenden</button></div></div>';

    // Allgemeines Aufwärmen
    html += '<div class="card exercise-live gw-card">'
      + '<div class="ex-live-head"><div class="ehl"><span class="ex-name">Aufwärmen</span><span class="slot-tag warm">WARM</span></div></div>'
      + '<div class="sets-block">'
      + '<div class="set-row warm gw-row' + (gw.done ? ' done' : '') + '">'
      + '<span class="set-i">AF</span>'
      + '<span class="gw-mid"><input type="number" class="num mini" data-live="gw.minutes" value="' + gw.minutes + '"> min ·'
      + ' <select data-live="gw.mode"><option value="bike"' + (gw.mode === "bike" ? " selected" : "") + '>Rad</option><option value="row"' + (gw.mode === "row" ? " selected" : "") + '>Rudern</option><option value="walk"' + (gw.mode === "walk" ? " selected" : "") + '>Gehen</option><option value="other"' + (gw.mode === "other" ? " selected" : "") + '>Sonstiges</option></select></span>'
      + '<label class="field f-done done-chk" title="Aufwärmen erledigt"><input type="checkbox" data-live="gw.done"' + (gw.done ? ' checked' : '') + '></label>'
      + '</div>'
      + '</div></div>';

    s.entries.forEach(function (en, ei) {
      var exo = exById(en.exerciseId); var bar = entryBar(en);
      var sug = en.suggestion || {};
      var showPlate = !!(KS.UI.plateShow && KS.UI.plateShow[ei]);
      html += '<div class="card exercise-live" data-ei="' + ei + '">';
      var barOpts = exo.category === "barbell" ? db().inventory.bars.map(function (bb) { return '<option value="' + bb.id + '"' + (bb.id === (en.barId || (firstBar() || {}).id) ? " selected" : "") + '>' + esc(bb.name) + ' ' + fmtW(bb.weight) + '</option>'; }).join("") : "";
      html += '<div class="ex-live-head"><div class="ehl"><span class="ex-name">' + esc(exo.name) + '</span>' + (exo.rm ? '<span class="slot-tag">1RM ' + fmtW(exo.rm) + '</span>' : '') + '</div>'
        + (exo.category === "barbell" ? '<div class="ehr"><label class="barpick">Stange <select data-barpick data-ei="' + ei + '">' + barOpts + '</select></label><button class="icon-btn plate-toggle' + (showPlate ? ' on' : '') + '" data-action="toggle-plate" data-ei="' + ei + '" aria-pressed="' + (showPlate ? 'true' : 'false') + '" title="' + (showPlate ? 'Scheiben ausblenden' : 'Scheiben einblenden') + '" aria-label="' + (showPlate ? 'Scheiben ausblenden' : 'Scheiben einblenden') + '">' + plateIcon("pt-ic") + '</button></div>' : '') + '</div>';

      // Sätze: Aufwärmen (A1..) und Arbeit (S1..) in einer Liste
      html += '<div class="sets-block">';
      html += '<div class="set-row head"><span class="set-i">Satz</span><span>Wdh</span><span>kg</span><span>RIR</span><span class="h-done">\u2713</span></div>';
      en.warmupSets.forEach(function (ws, wi) {
        html += '<div class="set-row warm' + (ws.done ? ' done' : '') + '">'
          + '<span class="set-i">A' + (wi + 1) + '</span>'
          + '<span class="ro">' + ws.reps + '</span>'
          + '<span class="ro">' + fmtNum(ws.weight) + '</span>'
          + '<span class="rir-empty"></span>'
          + '<label class="field f-done done-chk" title="Aufwärmsatz erledigt"><input type="checkbox" data-set="w" data-ei="' + ei + '" data-si="' + wi + '"' + (ws.done ? ' checked' : '') + '></label>'
          + '</div>'
          + (showPlate && bar ? '<div class="set-sub">' + plateHint(ws.weight, bar) + '</div>' : '');
      });
      en.sets.forEach(function (st, si) {
        html += workSetRow(ei, si, st, bar, showPlate && exo.category === "barbell");
      });
      html += '<div class="set-actions"><button class="btn tiny ghost" data-action="add-set" data-ei="' + ei + '">+ Satz</button>'
        + (en.sets.length > 1 ? '<button class="btn tiny ghost" data-action="del-set" data-ei="' + ei + '">– Satz</button>' : '') + '</div>';
      html += '</div></div>';
    });

    return html;
  }
  function bodyContextText() {
    var t = todayBody();
    if (!t) return '<span class="bc-none">noch nicht erfasst</span>';
    var adv = restAdvice();
    var lvl = adv.level === "rest" ? '<span class="bc-rest">Rest empfohlen</span>' : (adv.level === "caution" ? '<span class="bc-caut">Vorsicht</span>' : '<span class="bc-ok">grün</span>');
    return 'Beine ' + (t.legs || 0) + ' · OK ' + (t.upper_body || 0) + ' · Gesamt ' + (t.overall || 0) + ' · Readiness ' + (t.readiness || 3) + (t.pain && t.pain.flag ? ' · Schmerz' : '') + ' — ' + lvl;
  }

  function workSetRow(ei, si, st, bar, showChips) {
    var isActive = !!(KS.UI.live && KS.UI.live.activeSet && KS.UI.live.activeSet.ei === ei && KS.UI.live.activeSet.si === si && !st.done);
    var rirCls = "rir-sel" + (st.score === 5 ? " fail" : "") + (st.done ? " set" : "");
    var rirOpts = [1, 2, 3, 4, 5].map(function (v) { var i = E.scoreInfo(v); return '<option value="' + v + '"' + (st.score === v ? " selected" : "") + '>' + i.rir + '</option>'; }).join("");
    var sub = (showChips && bar) ? '<div class="set-sub" data-sub-ei="' + ei + '" data-sub-si="' + si + '">' + plateHint(st.weight, bar) + '</div>' : "";
    return '<div class="set-row work' + (st.done ? ' done' : '') + (isActive ? ' active-next' : '') + '" data-ei="' + ei + '" data-si="' + si + '">'
      + '<span class="set-i">S' + (si + 1) + '</span>'
      + '<div class="field f-reps"><input type="number" inputmode="numeric" class="num" data-set="reps" data-ei="' + ei + '" data-si="' + si + '" value="' + st.reps + '"></div>'
      + '<div class="field f-weight"><input type="number" step="0.25" inputmode="decimal" class="num" data-set="weight" data-ei="' + ei + '" data-si="' + si + '" value="' + st.weight + '"></div>'
      + '<div class="field f-rir"><select class="' + rirCls + '" data-set="score" data-ei="' + ei + '" data-si="' + si + '" title="RIR / Score je Satz">' + rirOpts + '</select></div>'
      + '<label class="field f-done done-chk" title="Satz erledigt"><input type="checkbox" data-set="done" data-ei="' + ei + '" data-si="' + si + '"' + (st.done ? " checked" : "") + '></label>'
      + '</div>' + sub;
  }
  function bindLiveInputs() {
    var root = document.getElementById("app");
    root.querySelectorAll("[data-live]").forEach(function (el) {
      el.addEventListener("change", function () { setLivePath(el.getAttribute("data-live"), el.type === "checkbox" ? el.checked : (el.type === "number" ? parseFloat(el.value) : el.value)); });
    });
    root.querySelectorAll(".set-row [data-set]").forEach(function (el) {
      var ev = (el.type === "checkbox" || el.tagName === "SELECT") ? "change" : "input";
      el.addEventListener(ev, function () { onSetChange(el); });
    });
    // Klick-Ton + Vibration fuer jede Erledigt-Checkbox (on wie off)
    root.querySelectorAll(".done-chk input[type=checkbox]").forEach(function (el) {
      el.addEventListener("change", function () { clickTick(el.checked); });
    });
  }
  function setLivePath(path, val) {
    var parts = path.split("."); var o = KS.UI.live;
    for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
    persist();
  }
  function onSetChange(el) {
    var ei = +el.getAttribute("data-ei"), si = +el.getAttribute("data-si"), kind = el.getAttribute("data-set");
    if (kind === "w") { KS.UI.live.entries[ei].warmupSets[si].done = el.checked; var wr = el.closest(".set-row"); if (wr) wr.classList.toggle("done", el.checked); persist(); return; }
    var st = KS.UI.live.entries[ei].sets[si];
    if (kind === "reps") st.reps = parseInt(el.value, 10) || 0;
    else if (kind === "weight") { var nw = parseFloat(el.value); if (nw !== st.targetWeight) markAdjust(st, "Gewicht angepasst"); st.weight = isNaN(nw) ? 0 : nw; }
    else if (kind === "score") { st.score = +el.value; st.failed = (st.score === 5); }
    else if (kind === "failed") st.failed = el.checked;
    else if (kind === "done") { var wasDone = st.done; st.done = el.checked; if (!wasDone && st.done) onSetCompleted(ei, si); }
    if (kind === "reps" && st.reps < st.targetReps && st.done) { /* verfehlt – kein Auto-Fail, Nutzer entscheidet */ }
    refreshSetStatus(ei, si);
    persist();
  }
  function markAdjust(st, note) { st.adjusted = true; st.adjustNote = note; }
  function refreshSetStatus(ei, si) {
    var row = document.querySelector('.set-row.work[data-ei="' + ei + '"][data-si="' + si + '"]');
    if (!row) return;
    var st = KS.UI.live.entries[ei].sets[si];
    row.classList.toggle("done", !!st.done);
    var sel = row.querySelector(".rir-sel");
    if (sel) { sel.classList.toggle("fail", st.score === 5); sel.classList.toggle("set", !!st.done); }
    var enX = KS.UI.live.entries[ei];
    if ((exById(enX.exerciseId) || {}).category === "barbell") {
      var sub = document.querySelector('.set-sub[data-sub-ei="' + ei + '"][data-sub-si="' + si + '"]');
      if (sub) sub.innerHTML = plateHint(st.weight, entryBar(enX));
    }
  }

  // Workout beenden: bei sehr kurzer Dauer (< 5 min) nachfragen, sonst speichern.
  var MIN_WORKOUT_SEC = 300;
  function endWorkout() {
    var s = KS.UI.live; if (!s) return;
    openEndModal();
  }
  function discardWorkout() { skipRest(); KS.UI.live = null; db().live = null; persist(); render(); scrollToTop(); }
  function ensureEndModal() {
    if (document.getElementById("ks-end-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-end-modal"; ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Workout beenden">'
      + '<div class="ks-modal-head"><span class="ks-modal-title" id="ks-end-title">Workout beenden</span>'
      + '<button class="ks-modal-x" data-action="end-cancel" aria-label="Schließen">\u2715</button></div>'
      + '<div class="end-body" id="ks-end-body"></div>'
      + '<div class="end-btns">'
      + '<button class="btn primary" data-action="end-save">Speichern</button>'
      + '<button class="btn danger" data-action="end-discard">Verwerfen</button>'
      + '<button class="btn ghost" data-action="end-cancel">Abbrechen</button>'
      + '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeEndModal(); });
    document.body.appendChild(ov);
  }
  function openEndModal() {
    ensureEndModal();
    var es = KS.UI.live; var et = es ? tplById(es.templateId) : null;
    var endTitle = document.getElementById("ks-end-title");
    if (endTitle) endTitle.textContent = (es && es.kind === "skill")
      ? ("Skill " + (es.skillName || "") + " beenden")
      : ("Workout " + (et ? et.name : "") + " beenden");
    var body = document.getElementById("ks-end-body");
    if (body) body.innerHTML = endSummaryHTML();
    document.getElementById("ks-end-modal").classList.add("open");
  }
  // Kompakte Uebersicht der laufenden Session: pro Uebung die Arbeitssaetze
  // als Chips (erledigte gruen), oben Dauer und erledigt/gesamt.
  function endSummaryHTML() {
    var s = KS.UI.live; if (!s) return "";
    if (s.kind === "skill") return skillEndSummaryHTML(s);
    var t = tplById(s.templateId);
    var sec = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
    var totalWork = 0, totalDone = 0;
    var rows = (s.entries || []).map(function (en) {
      var exo = exById(en.exerciseId);
      var sets = en.sets || [];
      var done = sets.filter(function (x) { return x.done; }).length;
      totalWork += sets.length; totalDone += done;
      var chips = sets.map(function (x) {
        return '<span class="es-set' + (x.done ? ' done' : '') + '">' + (x.reps || 0) + '\u00D7' + fmtNum(x.weight) + '</span>';
      }).join("");
      return '<div class="es-ex">'
        + '<div class="es-ex-head"><span class="es-name">' + esc(exo ? exo.name : en.exerciseId) + '</span>'
        + '<span class="es-count' + (sets.length && done === sets.length ? ' done' : '') + '">' + done + '/' + sets.length + '</span></div>'
        + (chips ? '<div class="es-sets">' + chips + '</div>' : '')
        + '</div>';
    }).join("");
    var warn = sec < MIN_WORKOUT_SEC ? '<div class="es-warn">Erst ' + fmtDur(sec) + ' trainiert (unter 5 Min).</div>' : '';
    return '<div class="es-meta"><span>Dauer ' + fmtDur(sec) + '</span><span>' + totalDone + '/' + totalWork + ' Sätze</span></div>'
      + warn
      + '<div class="es-list">' + rows + '</div>'
      + '<div class="es-hint">Speichern übernimmt nur erledigte Sätze in den Verlauf.</div>';
  }
  function closeEndModal() { var m = document.getElementById("ks-end-modal"); if (m) m.classList.remove("open"); }

  // Start-Popup: zeigt vor dem Start eine kompakte Vorschau (gleiche Optik
  // wie das Beenden-Popup) und startet erst nach Bestaetigung ("Los geht's").
  function ensureStartModal() {
    if (document.getElementById("ks-start-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-start-modal"; ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Workout starten">'
      + '<div class="ks-modal-head"><span class="ks-modal-title" id="ks-start-title">Workout starten</span>'
      + '<button class="ks-modal-x" data-action="start-cancel" aria-label="Schließen">\u2715</button></div>'
      + '<div class="end-body" id="ks-start-body"></div>'
      + '<div class="end-btns">'
      + '<button class="btn primary" data-action="start-go">Los geht\u2019s</button>'
      + '<button class="btn ghost" data-action="start-cancel">Abbrechen</button>'
      + '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) cancelStart(); });
    document.body.appendChild(ov);
  }
  function openStartModal(tplId) {
    KS.UI.pendingLive = buildLive(tplId);
    ensureStartModal();
    var st = tplById(tplId);
    var titleEl = document.getElementById("ks-start-title");
    if (titleEl) titleEl.textContent = "Workout " + (st ? st.name : "") + " starten";
    var body = document.getElementById("ks-start-body");
    if (body) body.innerHTML = startSummaryHTML();
    document.getElementById("ks-start-modal").classList.add("open");
  }
  // Kompakte Vorschau der geplanten Session: pro Uebung die Arbeitssaetze
  // als Chips (reps x kg), oben Workout, Anzahl Uebungen und Saetze.
  function startSummaryHTML() {
    var s = KS.UI.pendingLive; if (!s) return "";
    if (s.kind === "skill") return skillStartSummaryHTML(s);
    var t = tplById(s.templateId);
    var totalWork = 0;
    var rows = (s.entries || []).map(function (en) {
      var exo = exById(en.exerciseId);
      var sets = en.sets || [];
      totalWork += sets.length;
      var chips = sets.map(function (x) {
        return '<span class="es-set">' + (x.reps || 0) + '\u00D7' + fmtNum(x.weight) + '</span>';
      }).join("");
      return '<div class="es-ex">'
        + '<div class="es-ex-head"><span class="es-name">' + esc(exo ? exo.name : en.exerciseId) + '</span>'
        + '<span class="es-count">' + sets.length + ' \u00D7 Satz</span></div>'
        + (chips ? '<div class="es-sets">' + chips + '</div>' : '')
        + '</div>';
    }).join("");
    var bodyNote = todayBody() ? "" :
      '<div class="es-bodywarn"><div class="es-bw-txt"><strong>Körperzustand heute noch nicht erfasst</strong><span>Kurz eintragen, dann passen die Gewichtsvorschläge besser. Du kannst aber auch direkt starten.</span></div>'
      + '<button class="btn" data-action="start-to-body">Körperzustand eintragen</button></div>';
    return bodyNote
      + '<div class="es-list">' + rows + '</div>';
  }
  // Aus dem Start-Popup zum Koerper-Tab: Vorschau verwerfen, dort eintragen,
  // danach erneut starten (buildLive nutzt dann den neuen Koerperzustand).
  function startToBody() { KS.UI.pendingLive = null; closeStartModal(); KS.UI.tab = "body"; KS.UI.menuOpen = false; render(); scrollToTop(); }
  function confirmStart() {
    if (!KS.UI.pendingLive) { closeStartModal(); return; }
    KS.UI.live = KS.UI.pendingLive;
    KS.UI.live.startedAt = Date.now();
    KS.UI.pendingLive = null;
    db().live = KS.UI.live;
    closeStartModal();
    clickTick(true);
    persist();
    render();
    scrollToTop();
  }
  function cancelStart() { KS.UI.pendingLive = null; closeStartModal(); }
  function closeStartModal() { var m = document.getElementById("ks-start-modal"); if (m) m.classList.remove("open"); }
  // Nach oben scrollen (window und ggf. scrollender Container), z. B. beim Start.
  function finishSession() {
    var s = KS.UI.live;
    s.status = "done";
    s.endedAt = Date.now();
    if (s.startedAt) s.durationSec = Math.max(0, Math.round((s.endedAt - s.startedAt) / 1000));
    s.entries.forEach(function (en) {
      var exo = exById(en.exerciseId);
      // Nur tatsaechlich erledigte Saetze behalten – ungemachte verfallen und tauchen nicht im Verlauf auf
      en.warmupSets = (en.warmupSets || []).filter(function (x) { return x.done; });
      en.sets = (en.sets || []).filter(function (x) { return x.done; });
      if (!en.sets.length) { en.hadDeviation = false; en.est1RM = null; return; }
      en.sets.forEach(function (st) { st.metTarget = E.metTarget(st); });
      en.hadDeviation = E.hadDeviation(en.sets.filter(function (x) { return x.type !== "warmup"; }));
      var best = E.best1RMFromSets(en.sets, db().settings.rmFormula);
      en.est1RM = best.value;
      // Übung aktualisieren: nächstes Arbeitsgewicht = höchstes geleistetes Arbeitsgewicht
      var ws = en.sets.filter(function (x) { return x.type !== "warmup" && x.done; });
      if (ws.length) { exo.workWeight = Math.max.apply(null, ws.map(function (x) { return x.weight; })); }
      if (best.value && (exo.metrics.indexOf("est1RM") >= 0)) { exo.rm = best.value; exo.rmAsOf = s.date; exo.rmStale = false; }
    });
    delete s.suggestionMeta;
    s.body = snapshotBody();
    s.entries.forEach(function (en) { delete en.suggestion; });
    // Übungen ohne erledigte Arbeitssätze nicht im Verlauf speichern
    s.entries = s.entries.filter(function (en) { return en.sets && en.sets.length; });
    // Globale Journey-Wochennummer einfrieren (nur Journey-Einheiten; Yoga/Skills laufen
    // hier nicht durch). before-Zaehlung ist von dieser Einheit unabhaengig -> Reihenfolge egal.
    if (s.journeyId) {
      var freqW = db().settings.weeklyFrequencyTarget || 3;
      s.week = KS.journeyWeekForDate(s.date, db().sessions, s.journeyId, freqW);
    }
    db().sessions.push(s);
    KS.UI.live = null;
    db().live = null;
    persist();
    KS.UI.tab = "workouts"; render(); scrollToTop();
  }

  /* =========================================================
     Skill-Live-Session (zweiter Renderpfad; UI.live.kind === "skill")
     ========================================================= */
  function buildSkillLive(skillId) {
    var def = KS.skillById(skillId);
    var prog = KS.skillProgressFor(skillId);
    var adv = E.skillAdvice(def, prog, []); // Uebungen/Phase haengen nicht am Equipment; Tor greift in der Auswahl
    var exercises = adv.exercises.map(function (e) {
      var sets = [];
      for (var i = 0; i < e.sets; i++) sets.push({ value: null, done: false, met: false });
      return { name: e.name, metric: e.metric, target: e.target, tempo: e.tempo || null, sets: sets };
    });
    return {
      id: "sk_" + today().replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000),
      kind: "skill", date: today(), status: "live", startedAt: Date.now(),
      skillId: skillId, skillName: def.name, phase: adv.phaseIndex, mastered: !!prog.mastered,
      exercises: exercises, result: null
    };
  }

  function liveSkillSession() {
    var s = KS.UI.live;
    if (!s.startedAt) s.startedAt = Date.now();
    var timersOn = !!((db().settings.timers || {}).autoStart);
    var html = '<div class="live-head">'
      + '<div class="live-head-l"><div class="section-title">Training · Skill ' + esc(s.skillName || "") + '</div></div>'
      + '<div class="live-head-r"><span class="live-clock" id="live-clock" title="Trainingsdauer">' + fmtDur((Date.now() - s.startedAt) / 1000) + '</span>'
      + '<button class="icon-btn timer-toggle' + (timersOn ? ' on' : '') + '" data-action="toggle-timers" aria-pressed="' + (timersOn ? 'true' : 'false') + '" title="Pausen-Timer ein/aus" aria-label="Pausen-Timer ein- oder ausschalten">' + timerIcon() + '</button>'
      + '<button class="btn end-btn small" data-action="finish-workout">Beenden</button></div></div>';
    if (s.mastered) html += '<div class="card sk-mastered-note">Skill gemeistert – Erhaltungstraining der letzten Phase.</div>';

    s.exercises.forEach(function (we, ei) {
      var isDur = we.metric === "duration";
      var unit = isDur ? "s" : "Wdh";
      var tag = isDur ? "DAUER" : "WDH";
      html += '<div class="card exercise-live skill-ex" data-ei="' + ei + '">'
        + '<div class="ex-live-head"><div class="ehl"><span class="ex-name">' + esc(we.name) + '</span>'
        + '<span class="slot-tag sk-tag">' + tag + '</span></div>'
        + (we.tempo ? '<div class="ehr"><span class="sk-tempo">' + esc(we.tempo) + '</span></div>' : '') + '</div>'
        + '<div class="sets-block">'
        + '<div class="set-row head sk-head"><span class="set-i">Satz</span><span>Ziel</span><span>' + (isDur ? "Sek." : "Wdh") + '</span><span class="h-done">\u2713</span></div>';
      we.sets.forEach(function (st, si) {
        var tgt = isDur ? (we.target + " s") : (we.target + " Wdh");
        var valCell = isDur
          ? '<div class="field sk-valwrap"><input type="number" inputmode="numeric" class="num" data-skset="value" data-ei="' + ei + '" data-si="' + si + '" value="' + (st.value == null ? "" : st.value) + '" placeholder="0">'
            + '<button type="button" class="sk-watch-btn" data-ei="' + ei + '" data-si="' + si + '" title="Stoppuhr" aria-label="Stoppuhr starten/stoppen">\u25B7</button></div>'
          : '<div class="field"><input type="number" inputmode="numeric" class="num" data-skset="value" data-ei="' + ei + '" data-si="' + si + '" value="' + (st.value == null ? "" : st.value) + '" placeholder="0"></div>';
        html += '<div class="set-row work sk-row' + (st.done ? ' done' : '') + '" data-ei="' + ei + '" data-si="' + si + '">'
          + '<span class="set-i">S' + (si + 1) + '</span>'
          + '<span class="sk-target">' + tgt + '</span>'
          + valCell
          + '<label class="field f-done done-chk" title="Satz erledigt"><input type="checkbox" data-skdone data-ei="' + ei + '" data-si="' + si + '"' + (st.done ? " checked" : "") + '></label>'
          + '</div>';
      });
      html += '</div></div>';
    });
    return html;
  }

  function bindSkillLiveInputs() {
    var root = document.getElementById("app"); if (!root) return;
    root.querySelectorAll('[data-skset="value"]').forEach(function (el) {
      el.addEventListener("input", function () { onSkillSetInput(el); });
    });
    root.querySelectorAll('[data-skdone]').forEach(function (el) {
      el.addEventListener("change", function () { onSkillDone(el); clickTick(el.checked); });
    });
    root.querySelectorAll('.sk-watch-btn').forEach(function (el) {
      el.addEventListener("click", function () { skillWatchToggle(+el.getAttribute("data-ei"), +el.getAttribute("data-si")); });
    });
  }
  function onSkillSetInput(el) {
    var ei = +el.getAttribute("data-ei"), si = +el.getAttribute("data-si");
    var v = parseInt(el.value, 10);
    KS.UI.live.exercises[ei].sets[si].value = isNaN(v) ? null : v;
    persist();
  }
  function onSkillDone(el) {
    var ei = +el.getAttribute("data-ei"), si = +el.getAttribute("data-si");
    var st = KS.UI.live.exercises[ei].sets[si];
    var wasDone = st.done; st.done = el.checked;
    var row = el.closest(".set-row"); if (row) row.classList.toggle("done", el.checked);
    if (!wasDone && st.done) {
      ensureAudio();
      var T = db().settings.timers || {};
      if (T.autoStart) startRest("set", T.setRestSec, ei, si);
    }
    persist();
  }

  /* Stoppuhr fuer Dauer-Saetze: eine zur Zeit. Schreibt Sekunden in set.value,
     piept beim Erreichen des Ziels; Wert bleibt manuell ueberschreibbar. */
  var skWatch = { ei: -1, si: -1, t: null, base: 0, startMs: 0, beeped: false };
  function updateWatchBtn(ei, si, running) {
    var b = document.querySelector('.sk-watch-btn[data-ei="' + ei + '"][data-si="' + si + '"]');
    if (b) { b.textContent = running ? "\u25A0" : "\u25B7"; b.classList.toggle("running", !!running); }
  }
  function skillWatchTick() {
    if (skWatch.ei < 0) return;
    var ex = KS.UI.live.exercises[skWatch.ei]; var st = ex.sets[skWatch.si];
    var elapsed = skWatch.base + Math.floor((Date.now() - skWatch.startMs) / 1000);
    st.value = elapsed;
    var inp = document.querySelector('[data-skset="value"][data-ei="' + skWatch.ei + '"][data-si="' + skWatch.si + '"]');
    if (inp) inp.value = elapsed;
    if (!skWatch.beeped && ex.target && elapsed >= ex.target) { skWatch.beeped = true; ensureAudio(); playBeep(); buzz(); }
  }
  function skillWatchStop() {
    if (skWatch.t) clearInterval(skWatch.t);
    var ei = skWatch.ei, si = skWatch.si;
    skWatch.t = null; skWatch.beeped = false;
    if (ei >= 0) { updateWatchBtn(ei, si, false); persist(); }
    skWatch.ei = -1; skWatch.si = -1;
  }
  function skillWatchToggle(ei, si) {
    if (skWatch.t && skWatch.ei === ei && skWatch.si === si) { skillWatchStop(); return; }
    if (skWatch.t) skillWatchStop();
    var st = KS.UI.live.exercises[ei].sets[si];
    skWatch.ei = ei; skWatch.si = si; skWatch.base = Number(st.value) || 0; skWatch.startMs = Date.now(); skWatch.beeped = false;
    ensureAudio();
    skWatch.t = setInterval(skillWatchTick, 200);
    updateWatchBtn(ei, si, true);
  }

  function finishSkillSession() {
    var s = KS.UI.live; if (!s) return;
    skillWatchStop();
    var def = KS.skillById(s.skillId);
    var ph = def.phases[s.phase];
    s.exercises.forEach(function (we, i) {
      var pe = ph.exercises[i];
      we.sets = (we.sets || []).filter(function (x) { return x.done; });
      we.sets.forEach(function (x) { x.met = E.skillSetMet(pe.metric, pe.target, x); });
    });
    s.result = E.skillSessionResult(ph.exercises, s.exercises);
    var prog = KS.skillProgressFor(s.skillId);
    if (s.result === "completed") {
      prog.consecutiveCount = (prog.consecutiveCount || 0) + 1;
      if (prog.consecutiveCount >= ph.consecutiveSessions) {
        prog.currentPhase = (prog.currentPhase || 0) + 1;
        prog.consecutiveCount = 0;
        if (prog.currentPhase >= def.phases.length) { prog.currentPhase = def.phases.length - 1; prog.mastered = true; }
      }
    } else if (s.result === "missed") {
      prog.consecutiveCount = 0;
    } // skipped -> unveraendert
    var dur = s.startedAt ? Math.max(0, Math.round((Date.now() - s.startedAt) / 1000)) : 0;
    db().sessions.push({
      id: s.id, date: s.date, type: "skill", status: "done", durationSec: dur,
      entries: [],
      skillWork: { skillId: s.skillId, phase: s.phase, result: s.result, exercises: s.exercises }
    });
    KS.UI.live = null; db().live = null; persist();
    KS.UI.tab = "workouts"; render(); scrollToTop();
  }

  // Start-Popup fuer Skills (teilt sich das Modal mit dem Workout).
  function openSkillStartModal(skillId) {
    KS.UI.pendingLive = buildSkillLive(skillId);
    ensureStartModal();
    var titleEl = document.getElementById("ks-start-title");
    if (titleEl) titleEl.textContent = "Skill " + (KS.UI.pendingLive.skillName || "") + " starten";
    var body = document.getElementById("ks-start-body");
    if (body) body.innerHTML = startSummaryHTML();
    document.getElementById("ks-start-modal").classList.add("open");
  }
  function skillStartSummaryHTML(s) {
    var rows = (s.exercises || []).map(function (we) {
      var tgt = we.metric === "duration" ? (we.target + " s") : (we.target + " Wdh");
      var chips = (we.sets || []).map(function () { return '<span class="es-set">' + tgt + '</span>'; }).join("");
      return '<div class="es-ex"><div class="es-ex-head"><span class="es-name">' + esc(we.name) + '</span>'
        + '<span class="es-count">' + (we.sets || []).length + ' \u00D7 Satz</span></div>'
        + '<div class="es-sets">' + chips + '</div></div>';
    }).join("");
    return '<div class="es-list">' + rows + '</div>';
  }
  function skillEndSummaryHTML(s) {
    var sec = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
    var totalSets = 0, doneSets = 0;
    var rows = (s.exercises || []).map(function (we) {
      var sets = we.sets || [];
      var done = sets.filter(function (x) { return x.done; }).length;
      totalSets += sets.length; doneSets += done;
      var unit = we.metric === "duration" ? "s" : "";
      var chips = sets.map(function (x) { return '<span class="es-set' + (x.done ? " done" : "") + '">' + (x.value == null ? "\u2013" : x.value) + unit + '</span>'; }).join("");
      return '<div class="es-ex"><div class="es-ex-head"><span class="es-name">' + esc(we.name) + '</span>'
        + '<span class="es-count' + (sets.length && done === sets.length ? " done" : "") + '">' + done + '/' + sets.length + '</span></div>'
        + (chips ? '<div class="es-sets">' + chips + '</div>' : '') + '</div>';
    }).join("");
    return '<div class="es-meta"><span>Dauer ' + fmtDur(sec) + '</span><span>' + doneSets + '/' + totalSets + ' Sätze</span></div>'
      + '<div class="es-list">' + rows + '</div>'
      + '<div class="es-hint">Speichern wertet die Session aus und schreibt den Fortschritt fort.</div>';
  }

  /* =========================================================
     View: Workouts (Liste + Kalender + Journey)
     ========================================================= */

  /* Export aller Live-Funktionen an den geteilten Namespace */
  KS.fmtDur = fmtDur;
  KS.manageClock = manageClock;
  /* Pausen-Timer + Signale gebuendelt; interne Helfer bleiben privat */
  KS.RestTimer = RestTimer;
  KS.syncActiveSet = syncActiveSet;
  KS.firstOpenSet = firstOpenSet;
  KS.nextOpenExercise = nextOpenExercise;
  KS.onSetCompleted = onSetCompleted;
  KS.buildLive = buildLive;
  KS.liveSession = liveSession;
  KS.bodyContextText = bodyContextText;
  KS.workSetRow = workSetRow;
  KS.bindLiveInputs = bindLiveInputs;
  KS.setLivePath = setLivePath;
  KS.onSetChange = onSetChange;
  KS.markAdjust = markAdjust;
  KS.refreshSetStatus = refreshSetStatus;
  KS.endWorkout = endWorkout;
  KS.discardWorkout = discardWorkout;
  KS.ensureEndModal = ensureEndModal;
  KS.openEndModal = openEndModal;
  KS.endSummaryHTML = endSummaryHTML;
  KS.closeEndModal = closeEndModal;
  KS.ensureStartModal = ensureStartModal;
  KS.openStartModal = openStartModal;
  KS.startSummaryHTML = startSummaryHTML;
  KS.startToBody = startToBody;
  KS.confirmStart = confirmStart;
  KS.cancelStart = cancelStart;
  KS.closeStartModal = closeStartModal;
  KS.finishSession = finishSession;
  KS.buildSkillLive = buildSkillLive;
  KS.liveSkillSession = liveSkillSession;
  KS.bindSkillLiveInputs = bindSkillLiveInputs;
  KS.openSkillStartModal = openSkillStartModal;
  KS.finishSkillSession = finishSkillSession;
})();
