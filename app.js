(function () {
  "use strict";

  var cfg = Object.assign({ GA_ID: "", FORM_URL: "", CONTACT_EMAIL: "" }, window.SYNCID_CONFIG || {});
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  /* ---------------- Analítica (GA4, solo con permiso) ---------------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  var gaOn = false;

  function loadGA() {
    if (gaOn || !cfg.GA_ID) return;
    gaOn = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.GA_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    var debug = /[?&]debug=1/.test(location.search);
    gtag("config", cfg.GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      debug_mode: debug
    });
  }
  function track(name, params) {
    if (gaOn) gtag("event", name, params || {});
  }

  var consent = $("#consent");
  var decision = lsGet("syncid_analytics");
  function showConsent() { if (consent) consent.hidden = false; }
  function setDecision(v) {
    lsSet("syncid_analytics", v);
    if (consent) consent.hidden = true;
    if (v === "granted") loadGA();
  }
  if (cfg.GA_ID) {
    if (decision === "granted") loadGA();
    else if (decision !== "denied") showConsent();
    $("#consent-yes").addEventListener("click", function () { setDecision("granted"); });
    $("#consent-no").addEventListener("click", function () { setDecision("denied"); });
    $("#prefs").addEventListener("click", showConsent);
  } else {
    var prefs = $("#prefs");
    if (prefs) prefs.hidden = true;
  }

  /* ---------------- Encuesta ---------------- */
  $$("[data-survey]").forEach(function (a) {
    var where = a.getAttribute("data-survey");
    if (cfg.FORM_URL) {
      a.href = cfg.FORM_URL;
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.setAttribute("aria-disabled", "true");
      a.addEventListener("click", function (e) { e.preventDefault(); });
      a.title = "La encuesta estará disponible muy pronto";
    }
    a.addEventListener("click", function () {
      if (cfg.FORM_URL) track("survey_click", { location: where });
    });
  });

  /* ---------------- Contacto del aviso ---------------- */
  if (cfg.CONTACT_EMAIL) {
    var link = $("#contact-link");
    link.href = "mailto:" + cfg.CONTACT_EMAIL;
    link.textContent = cfg.CONTACT_EMAIL;
    $("#contact-line").hidden = false;
  }
  var aviso = $("#aviso");
  if (aviso) aviso.addEventListener("toggle", function () { if (aviso.open) track("privacy_open"); });

  /* ---------------- Simulación ---------------- */
  var screen = $("#screen"), title = $("#screen-title"), msg = $("#screen-msg");
  var ripple = $("#ripple"), logEl = $("#log"), nudge = $("#nudge"), offline = $("#offline");

  var CASES = {
    activa: { id: "A7F3", state: "ok", word: "Permitido", text: "Pulsera activa. La entrada quedó registrada." },
    revocada: { id: "C21B", state: "no", word: "Revocada", text: "La pulsera se reportó como perdida y ya no abre." },
    copia: { id: "sin token", state: "no", word: "Denegado", text: "El UID se copió, pero la copia no trae un token válido." }
  };
  var OFFLINE = { state: "wait", word: "Sin confirmar", text: "Sin conexión no se puede validar. El acceso queda marcado para revisión y se sincroniza al volver la red." };
  var tried = {};
  var allTracked = false;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function now() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); }

  function addLog(c, res) {
    var empty = $(".log__empty", logEl);
    if (empty) empty.remove();
    var li = document.createElement("li");
    var t = document.createElement("span"); t.textContent = now();
    var b = document.createElement("span"); b.textContent = "Entrada " + c.id;
    var r = document.createElement("span"); r.textContent = res.word; r.className = "r-" + res.state;
    li.appendChild(t); li.appendChild(b); li.appendChild(r);
    logEl.insertBefore(li, logEl.firstChild);
    while (logEl.children.length > 6) logEl.removeChild(logEl.lastChild);
  }

  function run(key, btn) {
    var c = CASES[key];
    var off = offline.checked;
    var res = off ? OFFLINE : c;
    $$(".band").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    screen.setAttribute("data-state", res.state);
    title.textContent = res.word;
    msg.textContent = res.text;
    ripple.classList.remove("go"); void ripple.offsetWidth; ripple.classList.add("go");
    addLog(c, res);
    nudge.hidden = false;
    track("demo_run", { bracelet: key, connection: off ? "offline" : "online", result: off ? "sin_confirmar" : (key === "activa" ? "permitido" : (key === "revocada" ? "revocada" : "denegado")) });
    if (!off) tried[key] = true;
    if (!allTracked && tried.activa && tried.revocada && tried.copia) {
      allTracked = true;
      track("demo_all_cases");
    }
  }

  $$(".band").forEach(function (btn) {
    btn.addEventListener("click", function () { run(btn.getAttribute("data-band"), btn); });
  });
  offline.addEventListener("change", function () {
    track("demo_toggle_offline", { offline: offline.checked });
  });
})();
