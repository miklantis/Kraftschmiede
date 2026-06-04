/* Kraftschmiede – history.js (Schema 0.14). Vanilla JS, framework-frei.
   Verlauf/Historie: Workouts-Tab mit Kalender- und Listenansicht inkl.
   Session-Zusammenfassung. Aus app.js ausgelagert. Greift ueber window.KS
   auf geteilte Helfer und State zu (doneSessions/exById/tplById/skillById,
   esc/fmtNum/fmtDur/pad, KS.UI, render). calMonth/calShift/calToday halten
   den angezeigten Monat in KS.UI.calMonth. */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});

  /* duenne Wrapper auf geteilte Funktionen (window.KS) */
  function doneSessions() { return KS.doneSessions.apply(null, arguments); }
  function exById() { return KS.exById.apply(null, arguments); }
  function tplById() { return KS.tplById.apply(null, arguments); }
  function skillById() { return KS.skillById.apply(null, arguments); }
  function esc() { return KS.esc.apply(null, arguments); }
  function fmtNum() { return KS.fmtNum.apply(null, arguments); }
  function fmtDur() { return KS.fmtDur.apply(null, arguments); }
  function pad() { return KS.pad.apply(null, arguments); }
  function today() { return KS.today.apply(null, arguments); }
  function render() { return KS.render.apply(null, arguments); }

  // D3-Periodisierungsgrafik der aktiven Journey (Container #ks-journey-chart).
  function viewWorkouts() {
    var html = '<div class="section-title">Verlauf</div>';

    // Kalender / Liste – nur eine Ansicht gleichzeitig (Umschalter)
    var ss = doneSessions().slice().reverse();
    var view = KS.UI.woView || "calendar";
    html += '<div class="wo-viewbar">'
      + '<div class="seg">'
      + '<button class="seg-btn' + (view === "calendar" ? " on" : "") + '" data-action="wo-view" data-v="calendar">Kalender</button>'
      + '<button class="seg-btn' + (view === "list" ? " on" : "") + '" data-action="wo-view" data-v="list">Liste (' + ss.length + ')</button>'
      + '</div></div>';

    if (view === "calendar") {
      html += calendarHTML();
    } else if (!ss.length) {
      html += '<div class="empty">Noch keine Sessions. Starte ein Workout im Training-Tab.</div>';
    } else {
      html += '<div class="log-list">' + ss.map(function (s) {
        if (s.type === "yoga") {
          return '<div class="log-item yoga">'
            + '<div class="log-date">' + esc(s.date) + '</div>'
            + '<div class="log-body">'
            + '<div class="log-top"><span class="log-wo"><span class="yoga-tag sm">YOGA</span> Yoga / Mobility</span></div>'
            + '<div class="log-sub">' + (s.minutes || 0) + ' min' + (s.notes ? ' · ' + esc(s.notes) : '') + '</div>'
            + '</div>'
            + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
            + '</div>';
        }
        if (s.type === "skill") {
          var sw = s.skillWork || {};
          var sdef = skillById(sw.skillId);
          var sname = sdef ? sdef.name : (sw.skillId || "Skill");
          var phLabel = (sdef && sdef.phases[sw.phase]) ? sdef.phases[sw.phase].label : ("Phase " + ((sw.phase || 0) + 1));
          var resLabel = ({ completed: "geschafft", missed: "verfehlt", skipped: "abgebrochen" })[sw.result] || sw.result || "";
          var resCls = sw.result === "completed" ? "ok-badge" : (sw.result === "missed" ? "dev-badge" : "");
          var exSummary = (sw.exercises || []).map(function (we) {
            var dn = (we.sets || []).filter(function (x) { return x.done; }).length;
            var unit = we.metric === "duration" ? "s" : "Wdh";
            return esc(we.name) + " " + dn + "×" + (we.target || "") + unit;
          }).join(" · ");
          return '<div class="log-item skill">'
            + '<div class="log-date">' + esc(s.date) + '</div>'
            + '<div class="log-body">'
            + '<div class="log-top"><span class="log-wo"><span class="skill-tag sm">SKILL</span> ' + esc(sname) + '</span>'
            + (resLabel ? '<span class="' + resCls + '">' + esc(resLabel) + '</span>' : '') + '</div>'
            + '<div class="log-sub">' + esc(phLabel) + (exSummary ? ' · ' + exSummary : '') + '</div>'
            + (s.durationSec ? '<div class="log-meta"><span class="log-dur">Dauer ' + fmtDur(s.durationSec) + '</span></div>' : '')
            + '</div>'
            + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
            + '</div>';
        }
        var t = tplById(s.templateId);
        var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
        var vol = (s.entries || []).reduce(function (a, e) { return a + workVol(e); }, 0);
        return '<div class="log-item">'
          + '<div class="log-date">' + esc(s.date) + '</div>'
          + '<div class="log-body">'
          + '<div class="log-top"><span class="log-wo">Workout ' + esc(t ? t.name : "?") + '</span>'
          + (dev ? '<span class="dev-badge" title="Abweichung: geplant nicht erreicht / runterkorrigiert">Δ Abweichung</span>' : '<span class="ok-badge">im Plan</span>') + '</div>'
          + '<div class="log-sub">' + (s.entries || []).map(function (e) { var ex = exById(e.exerciseId); return esc(ex ? ex.name : e.exerciseId) + ' ' + setSummary(e); }).join(" · ") + '</div>'
          + '<div class="log-meta"><span class="log-vol">Vol ' + fmtNum(Math.round(vol)) + '</span>' + (s.durationSec ? '<span class="log-dur">Dauer ' + fmtDur(s.durationSec) + '</span>' : '') + '</div>'
          + '</div>'
          + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
          + '</div>';
      }).join("") + '</div>';
    }
    return html;
  }
  function workVol(entry) { return (entry.sets || []).filter(function (s) { return s.type !== "warmup"; }).reduce(function (a, s) { return a + (s.reps || 0) * (s.weight || 0); }, 0); }
  function setSummary(entry) {
    var ws = (entry.sets || []).filter(function (s) { return s.type !== "warmup"; });
    if (!ws.length) return "";
    var top = Math.max.apply(null, ws.map(function (s) { return s.weight || 0; }));
    return ws.length + "×" + (ws[0].reps) + "@" + fmtNum(top);
  }
  function calMonth() { if (!KS.UI.calMonth) { var n = new Date(); KS.UI.calMonth = { y: n.getFullYear(), m: n.getMonth() }; } return KS.UI.calMonth; }
  function calShift(d) { var c = calMonth(); var nm = c.m + d, ny = c.y; if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; } KS.UI.calMonth = { y: ny, m: nm }; render(); }
  function calToday() { var n = new Date(); KS.UI.calMonth = { y: n.getFullYear(), m: n.getMonth() }; render(); }
  function calendarHTML() {
    var cm = calMonth(); var y = cm.y, m = cm.m;
    var first = new Date(y, m, 1); var startDay = (first.getDay() + 6) % 7; var days = new Date(y, m + 1, 0).getDate();
    var byDate = {}; doneSessions().forEach(function (s) { (byDate[s.date] = byDate[s.date] || []).push(s); });
    var names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    var cells = names.map(function (n) { return '<div class="cal-dow">' + n + '</div>'; }).join("");
    for (var i = 0; i < startDay; i++) cells += '<div class="cal-cell empty"></div>';
    for (var d = 1; d <= days; d++) {
      var ds = y + "-" + pad(m + 1) + "-" + pad(d);
      var has = byDate[ds];
      var dot = "";
      if (has) {
        dot = has.map(function (s) {
          if (s.type === "yoga") return '<span class="cal-dot yoga">Yoga</span>';
          if (s.type === "skill") { var sd = skillById((s.skillWork || {}).skillId); return '<span class="cal-dot skill">' + esc(sd ? sd.name : "Skill") + '</span>'; }
          var t = tplById(s.templateId); var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
          return '<span class="cal-dot' + (dev ? ' dev' : '') + '">' + (t ? t.name : "•") + '</span>';
        }).join("");
      }
      cells += '<div class="cal-cell' + (ds === today() ? ' today' : '') + '"><span class="cal-d">' + d + '</span>' + dot + '</div>';
    }
    var mn = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][m];
    return '<div class="card"><div class="cal-head">'
      + '<button class="btn tiny ghost" data-action="cal-prev" title="Vormonat">‹</button>'
      + '<span class="cal-title">' + mn + ' ' + y + '</span>'
      + '<div class="cal-nav-r"><button class="btn tiny ghost" data-action="cal-today">Heute</button><button class="btn tiny ghost" data-action="cal-next" title="Folgemonat">›</button></div>'
      + '</div><div class="calendar">' + cells + '</div></div>';
  }

  KS.viewWorkouts = viewWorkouts;
  KS.calShift = calShift;
  KS.calToday = calToday;
})();
