/* Kraftschmiede – Cloud-Sync via Supabase
   ----------------------------------------------------------------
   Optionale Schicht. Stehen in config.js nur Platzhalter, bleibt die
   App rein lokal (localStorage) – diese Datei macht dann nichts.

   Vertrag mit app.js:
     window.KS_APP.getDB()        -> aktuelles In-Memory-DB-Objekt
     window.KS_APP.setDB(db)      -> DB ersetzen (cached lokal + rendert neu)
     window.KSSync.boot()         -> einmalig nach dem ersten render() aufgerufen
     window.KSSync.mountPanel()   -> nach jedem render() (fuellt #ks-sync-panel)
     window.KSSync.schedulePush() -> von persist() nach lokalem Speichern

   Datenmodell in Supabase: eine Tabelle "app_state" mit genau einer
   Zeile pro Nutzer (user_id), Spalte data (jsonb) = kompletter App-Zustand.
*/
(function () {
  "use strict";
  var TABLE = "app_state";
  var DEBOUNCE_MS = 1500;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var KSSync = {
    _client: null,
    _session: null,
    _pushTimer: null,
    _booted: false,
    _status: { state: "idle", msg: "" },

    _cfg: function () { return window.KS_CONFIG || {}; },

    _configured: function () {
      var c = this._cfg();
      return !!(window.supabase && c.SUPABASE_URL && c.SUPABASE_ANON_KEY
        && c.SUPABASE_URL.indexOf("http") === 0
        && c.SUPABASE_URL.indexOf("DEIN-") < 0
        && c.SUPABASE_ANON_KEY.indexOf("DEIN-") < 0);
    },

    _ensureClient: function () {
      if (this._client || !this._configured()) return this._client;
      var c = this._cfg();
      this._client = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
      return this._client;
    },

    boot: function () {
      if (this._booted) return;
      this._booted = true;
      if (!this._configured()) { this._setStatus("disabled", "nicht konfiguriert"); return; }
      var self = this, client = this._ensureClient();
      client.auth.getSession().then(function (res) {
        self._session = (res && res.data && res.data.session) || null;
        client.auth.onAuthStateChange(function (_evt, session) {
          var wasIn = !!self._session;
          self._session = session || null;
          self._refreshPanel();
          if (session && !wasIn) self._afterLogin();
          if (!session) self._setStatus("idle", "");
        });
        self._refreshPanel();
        if (self._session) self._afterLogin();
      }).catch(function (e) { self._setStatus("error", String(e && e.message || e)); });
    },

    _uid: function () { return (this._session && this._session.user) ? this._session.user.id : null; },
    _email: function () { return (this._session && this._session.user) ? this._session.user.email : ""; },

    /* Nach Login: Cloud-Stand holen. Existiert er, lokal anwenden.
       Existiert noch keiner, den aktuellen lokalen Stand hochladen. */
    _afterLogin: function () {
      var self = this, client = this._client, uid = this._uid();
      if (!client || !uid) return;
      this._setStatus("saving", "lade aus Cloud…");
      client.from(TABLE).select("data, updated_at").eq("user_id", uid).maybeSingle()
        .then(function (res) {
          if (res.error) { self._setStatus("error", res.error.message); return; }
          var row = res.data;
          if (row && row.data && Object.keys(row.data).length) {
            if (window.KS_APP) window.KS_APP.setDB(row.data);
            self._setStatus("saved", "synchronisiert");
          } else {
            self._push(); // erste Anmeldung -> lokalen Stand in die Cloud schreiben
          }
        });
    },

    schedulePush: function () {
      if (!this._configured() || !this._session) return;
      var self = this;
      clearTimeout(this._pushTimer);
      this._setStatus("saving", "speichere…");
      this._pushTimer = setTimeout(function () { self._push(); }, DEBOUNCE_MS);
    },

    _push: function () {
      var self = this, client = this._client, uid = this._uid();
      if (!client || !uid || !window.KS_APP) return;
      var db = window.KS_APP.getDB();
      client.from(TABLE).upsert(
        { user_id: uid, data: db, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ).then(function (res) {
        if (res.error) self._setStatus("error", res.error.message);
        else self._setStatus("saved", "synchronisiert");
      });
    },

    pullNow: function () {
      var self = this, client = this._client, uid = this._uid();
      if (!client || !uid) return;
      this._setStatus("saving", "lade…");
      client.from(TABLE).select("data").eq("user_id", uid).maybeSingle()
        .then(function (res) {
          if (res.error) { self._setStatus("error", res.error.message); return; }
          if (res.data && res.data.data && Object.keys(res.data.data).length) {
            if (window.KS_APP) window.KS_APP.setDB(res.data.data);
          }
          self._setStatus("saved", "synchronisiert");
        });
    },

    signUp: function (email, pw) { return this._client.auth.signUp({ email: email, password: pw }); },
    signIn: function (email, pw) { return this._client.auth.signInWithPassword({ email: email, password: pw }); },
    signOut: function () { var self = this; this._client.auth.signOut().then(function () { self._setStatus("idle", ""); }); },

    _setStatus: function (state, msg) {
      this._status = { state: state, msg: msg, at: Date.now() };
      this._refreshPanel();
      if (typeof this.onAuthChange === "function") { try { this.onAuthChange(); } catch (e) {} }
    },

    mountPanel: function () { this._refreshPanel(); },

    status: function () { return { configured: this._configured(), loggedIn: !!this._session, email: this._email() }; },

    _refreshPanel: function () {
      var el = document.getElementById("ks-sync-panel");
      if (!el) return;
      if (!this._configured()) {
        el.innerHTML = '<div class="hint">Cloud-Sync ist nicht eingerichtet. Trage deine Supabase-Werte in <strong>config.js</strong> ein (SUPABASE_URL und SUPABASE_ANON_KEY) und lade neu.</div>';
        return;
      }
      var st = this._status;
      var statusHtml = '<div class="ks-status ks-' + st.state + '">' + (st.msg ? esc(st.msg) : "bereit") + '</div>';
      if (!this._session) {
        el.innerHTML =
          '<div class="hint">Melde dich an, damit deine Daten geraeteuebergreifend gespeichert werden. Ohne Anmeldung laeuft die App lokal weiter.</div>'
          + '<div class="ks-form">'
          + '<input type="email" id="ks-email" placeholder="E-Mail" autocomplete="username">'
          + '<input type="password" id="ks-pass" placeholder="Passwort" autocomplete="current-password">'
          + '<div class="ks-btns">'
          + '<button class="btn primary" id="ks-login">Anmelden</button>'
          + '<button class="btn ghost" id="ks-signup">Registrieren</button>'
          + '</div>'
          + '<div class="ks-msg" id="ks-msg"></div>'
          + '</div>';
        this._wireAuth();
      } else {
        el.innerHTML =
          '<div class="ks-row"><span>Angemeldet als <strong>' + esc(this._email()) + '</strong></span>' + statusHtml + '</div>'
          + '<div class="ks-btns">'
          + '<button class="btn ghost" id="ks-push">Jetzt sichern</button>'
          + '<button class="btn ghost" id="ks-pull">Aus Cloud laden</button>'
          + '<button class="btn ghost" id="ks-logout">Abmelden</button>'
          + '</div>';
        this._wireSession();
      }
    },

    _wireAuth: function () {
      var self = this;
      var msg = document.getElementById("ks-msg");
      var val = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; };
      var run = function (fn) {
        var email = val("ks-email"), pw = val("ks-pass");
        if (!email || !pw) { if (msg) msg.textContent = "E-Mail und Passwort eingeben."; return; }
        if (msg) msg.textContent = "…";
        fn(email, pw).then(function (res) {
          if (res.error) { if (msg) msg.textContent = "Fehler: " + res.error.message; }
          else if (res.data && res.data.user && !res.data.session) { if (msg) msg.textContent = "Fast geschafft – bestaetige die E-Mail in deinem Postfach, dann anmelden."; }
        }).catch(function (e) { if (msg) msg.textContent = "Fehler: " + String(e && e.message || e); });
      };
      var l = document.getElementById("ks-login"); if (l) l.onclick = function () { run(self.signIn.bind(self)); };
      var s = document.getElementById("ks-signup"); if (s) s.onclick = function () { run(self.signUp.bind(self)); };
    },

    _wireSession: function () {
      var self = this;
      var p = document.getElementById("ks-push"); if (p) p.onclick = function () { self._push(); };
      var u = document.getElementById("ks-pull"); if (u) u.onclick = function () { if (window.confirm("Lokale Daten mit der Cloud-Version ueberschreiben?")) self.pullNow(); };
      var o = document.getElementById("ks-logout"); if (o) o.onclick = function () { self.signOut(); };
    }
  };

  window.KSSync = KSSync;
})();
