/* Purdue USB desktop.
   Wide screens: a window manager (many windows, drag, resize, minimize, maximize, close).
   Narrow screens: one app at a time. With no JS every section is simply shown, stacked.
   Roster and posts render from the embedded JSON. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mq = window.matchMedia("(min-width: 900px) and (min-height: 540px)");
  var wins = $$(".win[data-task]");
  var byId = {};
  wins.forEach(function (w) { byId[w.id] = w; });
  var tasks = $$(".task");
  var icons = $$(".icon");
  var empty = $("#empty");
  var wm = false;      // window-manager mode
  var current = null;  // single-app mode: the open window
  var maxed = null;    // single-app mode: the maximized window
  var active = null;   // window-manager mode: the focused window
  var zTop = 10;
  var DEF = { welcome: [860, 440], about: [940, 640], connect: [960, 620], board: [1000, 660], initiatives: [1020, 660] };
  var data = {};
  try { data = JSON.parse($("#data").textContent); } catch (e) { /* page still works without the data */ }

  function store(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val);
    } catch (e) { /* storage unavailable */ }
    return null;
  }
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function ext(a) { a.target = "_blank"; a.rel = "noopener"; return a; }

  /* ----- Render: board roster, former members, Instagram posts ----- */
  var det = $("#details");
  function showDetails(d) {
    if (!det) return;
    det.textContent = "";
    det.appendChild(el("h3", d.name));
    if (d.role) det.appendChild(el("p", d.role));
    if (d.year) det.appendChild(el("p", "Class: " + d.year));
    if (d.url) {
      var a = ext(el("a", "View profile", "btn"));
      a.href = d.url;
      det.appendChild(a);
    }
  }
  function renderBoard() {
    var r = data.roster || {};
    var files = $(".files");
    var members = r.members || [];
    if (files) {
      members.forEach(function (m) {
        var li = el("li");
        var b = el("button", "", "file");
        b.type = "button";
        b.setAttribute("aria-pressed", "false");
        b.dataset.name = m.name;
        if (m.title) b.dataset.role = m.title;
        if (m["class"]) b.dataset.year = m["class"];
        if (m.site) b.dataset.url = m.site;
        var av = el("span", "", "avatar");
        av.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-user"/></svg>';
        b.appendChild(av);
        b.appendChild(el("span", m.name, "fname"));
        if (m.title) b.appendChild(el("span", m.title, "fmeta"));
        if (m["class"]) b.appendChild(el("span", m["class"], "fmeta"));
        li.appendChild(b);
        files.appendChild(li);
      });
      files.addEventListener("click", function (e) {
        var b = e.target.closest(".file");
        if (!b) return;
        $$(".file", files).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        showDetails(b.dataset);
      });
    }
    var count = $("#count");
    if (count) count.textContent = members.length + " object(s)";
    var ul = $(".alumni");
    if (ul) {
      (r.former || []).forEach(function (m) {
        var li = el("li");
        if (m.site) { var a = ext(el("a", m.name)); a.href = m.site; li.appendChild(a); }
        else li.appendChild(el("span", m.name, "an"));
        if (m.title) li.appendChild(el("span", m.title, "role"));
        if (m["class"]) li.appendChild(el("span", "Class of " + m["class"], "yr"));
        ul.appendChild(li);
      });
    }
  }
  function ago(ts) {
    var h = Math.floor((Date.now() - new Date(ts)) / 36e5);
    if (!(h >= 0)) return "";
    return h < 24 ? h + " hours ago" : Math.floor(h / 24) + " days ago";
  }
  function renderPosts() {
    var box = $(".slides");
    if (!box) return;
    (data.posts || []).forEach(function (p) {
      var a = el("article", "", "post");
      var head = el("header", "", "post-head");
      head.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-flag"/></svg><div><strong>purdueusb</strong><span>Purdue USB</span></div>';
      var img = el("div", p.eventTitle || "Instagram post", "post-img");
      img.setAttribute("role", "img");
      img.setAttribute("aria-label", "Instagram post: " + (p.eventTitle || "image") + " (image placeholder)");
      var cap = el("p", "", "post-cap");
      cap.appendChild(el("strong", "purdueusb"));
      cap.appendChild(document.createTextNode(p.caption || ""));
      var foot = el("div", "", "post-foot");
      var link = ext(el("a", "View on Instagram"));
      link.href = p.permalink;
      var t = el("time", ago(p.timestamp));
      t.setAttribute("datetime", p.timestamp);
      foot.appendChild(link);
      foot.appendChild(t);
      [head, img, cap, foot].forEach(function (n) { a.appendChild(n); });
      box.appendChild(a);
    });
    function by(dir) { box.scrollBy({ left: dir * box.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" }); }
    var prev = $("#prev"), next = $("#next");
    if (prev) prev.addEventListener("click", function () { by(-1); });
    if (next) next.addEventListener("click", function () { by(1); });
  }
  renderBoard();
  renderPosts();
  var yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ----- Boot splash (once per session, skippable) ----- */
  function boot() {
    return new Promise(function (resolve) {
      if (reduce || store("usb-boot")) { resolve(); return; }
      var b = el("div", "", "boot");
      b.setAttribute("role", "status");
      b.innerHTML =
        '<div class="boot-logo"><svg class="ico" aria-hidden="true"><use href="#i-flag"/></svg>' +
        '<div><div class="boot-name">Purdue USB</div>' +
        '<div class="boot-sub">Computer Science Undergraduate Student Board</div></div></div>' +
        '<div class="boot-bar" aria-hidden="true"><i></i></div>' +
        '<p class="boot-hint">Starting… click or press any key to skip</p>';
      document.body.appendChild(b);
      document.documentElement.classList.add("booting");
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        store("usb-boot", "1");
        b.classList.add("out");
        setTimeout(function () {
          b.remove();
          document.documentElement.classList.remove("booting");
          resolve();
        }, 400);
      }
      setTimeout(finish, 2000);
      b.addEventListener("click", finish);
      document.addEventListener("keydown", finish, { once: true });
    });
  }

  /* ----- Clock ----- */
  var clock = $("#clock");
  function tick() {
    if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  tick();
  setInterval(tick, 15000);

  /* ----- Start menu ----- */
  var sb = $("#start");
  var sm = $("#start-menu");
  function setMenu(open) {
    if (!sb || !sm) return;
    sm.hidden = !open;
    sb.setAttribute("aria-expanded", String(open));
  }
  if (sb && sm) {
    sb.addEventListener("click", function (e) { e.stopPropagation(); setMenu(sm.hidden); });
    document.addEventListener("click", function (e) { if (!sm.hidden && !sm.contains(e.target)) setMenu(false); });
  }

  /* ----- Shared ----- */
  /* Links that open an app on this page. On the real site /initiatives is its own route. */
  var alias = { "/initiatives": "initiatives" };
  function appOf(href) {
    if (!href) return null;
    if (href.charAt(0) === "#") return byId[href.slice(1)] ? href.slice(1) : null;
    if (href.charAt(0) === "/" && href.indexOf("//") !== 0) return alias[href.split(/[?#]/)[0].replace(/\/$/, "")] || null;
    return null;
  }
  function replay(w) {
    w.classList.remove("opening");
    void w.offsetWidth;
    w.classList.add("opening");
  }
  function setMax(w, on) {
    w.classList.toggle("max", on);
    if (!wm) {
      document.body.classList.toggle("has-max", on);
      maxed = on ? w : null;
    }
    var b = $(".max", w);
    if (b) b.setAttribute("aria-label", on ? "Restore down" : "Maximize");
  }
  function sync() {
    if (wm) {
      tasks.forEach(function (t) {
        var w = byId[appOf(t.getAttribute("href"))];
        if (!w) return;
        t.hidden = w._s !== "open" && w._s !== "min";
        t.setAttribute("aria-current", active === w && w._s === "open" ? "true" : "false");
        t.classList.toggle("is-min", w._s === "min");
      });
      icons.forEach(function (i) {
        var w = byId[appOf(i.getAttribute("href"))];
        i.setAttribute("aria-current", w && active === w && w._s === "open" ? "true" : "false");
      });
      document.documentElement.classList.toggle("empty-desk", !openWins().length);
      return;
    }
    var id = current && current.id;
    tasks.concat(icons).forEach(function (n) {
      n.setAttribute("aria-current", id && appOf(n.getAttribute("href")) === id ? "true" : "false");
    });
    if (empty) empty.hidden = !!current;
  }

  /* ----- Single-app mode (narrow screens) ----- */
  function openApp(id, o) {
    var w = byId[id];
    if (!w) return;
    o = o || {};
    wins.forEach(function (x) { if (x !== w) { if (x === maxed) setMax(x, false); x.hidden = true; } });
    w.hidden = false;
    current = w;
    if (!o.quiet) replay(w);
    sync();
    window.scrollTo(0, 0);
    if (o.focus) w.focus({ preventScroll: true });
    if (o.history !== false) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* ignore */ } }
  }
  function closeApp() {
    if (!current) return;
    if (current === maxed) setMax(current, false);
    current.hidden = true;
    current = null;
    sync();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
  }

  /* ----- Window-manager mode (wide screens) ----- */
  function bounds() { var d = $(".desk"); return { w: d.clientWidth, h: d.clientHeight }; }
  function apply(w) {
    var g = w._g;
    w.style.left = g.x + "px";
    w.style.top = g.y + "px";
    w.style.width = g.w + "px";
    w.style.height = g.h + "px";
  }
  function place(w, i) {
    var b = bounds(), d = DEF[w.id] || [860, 520];
    var gw = Math.max(360, Math.min(d[0], b.w - 240));
    var gh = Math.max(240, Math.min(d[1], b.h - 32));
    w._g = {
      w: gw, h: gh,
      x: Math.min(232 + i * 32, Math.max(0, b.w - gw - 16)),
      y: Math.min(24 + i * 30, Math.max(0, b.h - gh - 16))
    };
    apply(w);
  }
  function front(w) {
    if (zTop > 700) {
      zTop = 10;
      wins.slice().sort(function (a, b) { return (parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0); })
        .forEach(function (x) { x.style.zIndex = ++zTop; });
    }
    w.style.zIndex = ++zTop;
  }
  function openWins() { return wins.filter(function (x) { return x._s === "open"; }); }
  function wmFocus(w) {
    front(w);
    active = w;
    wins.forEach(function (x) { x.classList.toggle("active", x === w); });
    sync();
  }
  function wmOpen(id, o) {
    var w = byId[id];
    if (!w) return;
    o = o || {};
    if (!w._g) place(w, wins.indexOf(w));
    if (w._s !== "open") {
      clearTimeout(w._t);
      w.classList.remove("minimizing");
      w.hidden = false;
      w._s = "open";
      if (!o.quiet) replay(w);
    }
    wmFocus(w);
    if (o.focus) w.focus({ preventScroll: true });
  }
  function wmHide(w, state) {
    if (w._s !== "open") return;
    w._s = state;
    if (state === "closed" && w.classList.contains("max")) setMax(w, false);
    var done = function () {
      w.hidden = true;
      w.classList.remove("minimizing");
      if (active === w) {
        active = null;
        var next = openWins().sort(function (a, b) { return (parseInt(b.style.zIndex, 10) || 0) - (parseInt(a.style.zIndex, 10) || 0); })[0];
        if (next) { wmFocus(next); return; }
        wins.forEach(function (x) { x.classList.remove("active"); });
      }
      sync();
    };
    clearTimeout(w._t);
    if (reduce) done();
    else { w.classList.add("minimizing"); w._t = setTimeout(done, 190); }
    sync();
  }
  function enterWM() {
    var startId = current ? current.id : (location.hash && byId[location.hash.slice(1)] ? location.hash.slice(1) : null);
    wm = true;
    document.documentElement.classList.add("wm");
    document.body.classList.remove("has-max");
    maxed = null;
    current = null;
    wins.forEach(function (w, i) {
      w.classList.remove("max", "opening", "minimizing");
      w.hidden = true;
      w._s = "closed";
      if (!w._g) place(w, i); else apply(w);
    });
    $$(".titlebar").forEach(function (t) { t.tabIndex = 0; t.title = "Drag to move. Arrow keys also move the window; Enter maximizes."; });
    if (startId) wmOpen(startId, { quiet: true }); else sync();
    window.scrollTo(0, 0);
  }
  function exitWM() {
    var id = active ? active.id : "about";
    wm = false;
    active = null;
    document.documentElement.classList.remove("wm", "empty-desk");
    wins.forEach(function (w) {
      ["left", "top", "width", "height", "zIndex"].forEach(function (p) { w.style[p] = ""; });
      w.classList.remove("active", "max", "minimizing");
      w.hidden = true;
      w._s = "closed";
    });
    tasks.forEach(function (t) { t.hidden = false; });
    $$(".titlebar").forEach(function (t) { t.removeAttribute("tabindex"); t.removeAttribute("title"); });
    openApp(id, { quiet: true, history: false });
  }

  function openAny(id, o) { if (wm) wmOpen(id, o); else openApp(id, o); }

  /* ----- Window chrome: controls, drag, resize, keyboard ----- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (sm && !sm.hidden) { setMenu(false); if (sb) sb.focus(); }
    else if (wm && active && active.classList.contains("max")) setMax(active, false);
    else if (!wm && maxed) setMax(maxed, false);
  });

  wins.forEach(function (w) {
    var bar = $(".titlebar", w);
    var ctl = el("div", "", "ctl");
    ctl.innerHTML =
      '<button type="button" class="min" aria-label="Minimize to the taskbar"><span class="g"></span></button>' +
      '<button type="button" class="max" aria-label="Maximize"><span class="g"></span></button>' +
      '<button type="button" class="close" aria-label="Close"><span class="g"></span></button>';
    bar.appendChild(ctl);
    $(".min", ctl).addEventListener("click", function () { if (wm) wmHide(w, "min"); else closeApp(); });
    $(".close", ctl).addEventListener("click", function () { if (wm) wmHide(w, "closed"); else closeApp(); });
    $(".max", ctl).addEventListener("click", function () { setMax(w, !w.classList.contains("max")); });
    bar.addEventListener("dblclick", function (e) { if (!ctl.contains(e.target)) setMax(w, !w.classList.contains("max")); });
    $$(".files li, .program", w).forEach(function (item, i) { item.style.setProperty("--i", Math.min(i, 14)); });

    /* focus on any press inside the window */
    w.addEventListener("pointerdown", function () { if (wm && active !== w) wmFocus(w); }, true);

    /* drag by the title bar; the mousedown default is cancelled so no text gets selected */
    bar.addEventListener("mousedown", function (e) { if (wm && !ctl.contains(e.target)) e.preventDefault(); });
    bar.addEventListener("pointerdown", function (e) {
      if (!wm || e.button || ctl.contains(e.target) || w.classList.contains("max")) return;
      var g = w._g, sx = e.clientX, sy = e.clientY, ox = g.x, oy = g.y, b = bounds();
      bar.setPointerCapture(e.pointerId);
      w.classList.add("dragging");
      function move(ev) {
        g.x = clamp(ox + ev.clientX - sx, 80 - g.w, b.w - 80);
        g.y = clamp(oy + ev.clientY - sy, 0, b.h - 40);
        apply(w);
      }
      function up() {
        w.classList.remove("dragging");
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
      }
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });

    /* keyboard alternative to dragging */
    bar.addEventListener("keydown", function (e) {
      if (!wm || e.target !== bar || w.classList.contains("max")) return;
      var step = e.shiftKey ? 64 : 16, g = w._g, b = bounds(), moved = true;
      if (e.key === "ArrowLeft") g.x -= step;
      else if (e.key === "ArrowRight") g.x += step;
      else if (e.key === "ArrowUp") g.y -= step;
      else if (e.key === "ArrowDown") g.y += step;
      else moved = false;
      if (moved) {
        e.preventDefault();
        g.x = clamp(g.x, 80 - g.w, b.w - 80);
        g.y = clamp(g.y, 0, b.h - 40);
        apply(w);
      } else if (e.key === "Enter") {
        e.preventDefault();
        setMax(w, !w.classList.contains("max"));
      }
    });

    /* resize from the bottom-right corner */
    var grip = el("div", "", "grip");
    grip.setAttribute("aria-hidden", "true");
    w.appendChild(grip);
    grip.addEventListener("mousedown", function (e) { if (wm) e.preventDefault(); });
    grip.addEventListener("pointerdown", function (e) {
      if (!wm || e.button) return;
      var g = w._g, sx = e.clientX, sy = e.clientY, ow = g.w, oh = g.h, b = bounds();
      grip.setPointerCapture(e.pointerId);
      w.classList.add("dragging");
      function move(ev) {
        g.w = clamp(ow + ev.clientX - sx, 360, Math.max(360, b.w - g.x));
        g.h = clamp(oh + ev.clientY - sy, 220, Math.max(220, b.h - g.y));
        apply(w);
      }
      function up() {
        w.classList.remove("dragging");
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
        grip.removeEventListener("pointercancel", up);
      }
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
      grip.addEventListener("pointercancel", up);
    });
  });

  /* keep windows reachable when the browser is resized */
  window.addEventListener("resize", function () {
    if (!wm) return;
    var b = bounds();
    wins.forEach(function (w) {
      if (!w._g) return;
      w._g.x = clamp(w._g.x, 80 - w._g.w, b.w - 80);
      w._g.y = clamp(w._g.y, 0, Math.max(0, b.h - 40));
      apply(w);
    });
  });

  /* ----- Tray notifications ----- */
  function notice(title, text, href, label, ms) {
    var old = $(".balloon");
    if (old) old.remove();
    var b = el("div", "", "balloon");
    b.setAttribute("role", "status");
    var x = el("button", "×", "balloon-x");
    x.type = "button";
    x.setAttribute("aria-label", "Dismiss");
    b.appendChild(x);
    b.appendChild(el("strong", title));
    b.appendChild(el("p", text));
    if (href) { var a = el("a", label); a.href = href; b.appendChild(a); }
    document.body.appendChild(b);
    var t = setTimeout(close, ms || 9000);
    function close() { clearTimeout(t); b.remove(); }
    x.addEventListener("click", close);
  }
  function welcomeToast() {
    if (reduce || store("usb-balloon")) return;
    store("usb-balloon", "1");
    notice("Welcome to Purdue USB", "Click the About Us icon to get started, or open the Start menu to see everything.", "#about", "Open About Us");
  }

  /* ----- Link handling ----- */
  /* DESIGN-PREVIEW ONLY (the final notice branch): remove when porting to the real site.
     This project builds the homepage only, so any other internal route shows a notice
     instead of a 404. External and mailto links are left alone. */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var t = e.target.closest ? e.target : e.target.parentNode;
    var opener = t.closest("[data-open]");
    if (opener) {
      e.preventDefault();
      setMenu(false);
      openAny(opener.getAttribute("data-open"), { focus: true });
      return;
    }
    var a = t.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    var id = appOf(href);
    if (id) {
      e.preventDefault();
      setMenu(false);
      var w = byId[id];
      if (a.classList.contains("task")) {
        /* taskbar button: restore, minimize if already in front, or bring to front */
        if (wm) { if (w._s === "open" && active === w) wmHide(w, "min"); else wmOpen(id, { focus: true }); }
        else if (current === w) closeApp();
        else openApp(id, { focus: true });
      } else openAny(id, { focus: true });
      return;
    }
    if (href.charAt(0) === "/" && href.indexOf("//") !== 0) {
      e.preventDefault();
      setMenu(false);
      var name = a.getAttribute("data-label") || a.textContent.replace(/\s+/g, " ").trim() || href;
      notice("Design preview", name + " isn't part of this preview yet. Only the homepage is built.", null, null, 6000);
    }
  });
  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (!byId[id]) return;
    if (wm) wmOpen(id, { focus: true });
    else if (byId[id] !== current) openApp(id, { history: false });
  });

  /* ----- Start up ----- */
  /* The browser may jump to a #hash target before windows are laid out, so reset the scroll
     once the layout has settled. */
  var first = location.hash && byId[location.hash.slice(1)] ? location.hash.slice(1) : "about";
  if (mq.matches) enterWM(); else openApp(first, { history: false, quiet: true });
  requestAnimationFrame(function () { window.scrollTo(0, 0); });
  var onMq = function (e) { if (e.matches && !wm) enterWM(); else if (!e.matches && wm) exitWM(); };
  if (mq.addEventListener) mq.addEventListener("change", onMq); else mq.addListener(onMq);
  boot().then(function () {
    var w = wm ? active : current;
    if (w) replay(w);
    window.scrollTo(0, 0);
    setTimeout(welcomeToast, 1200);
  });
})();
