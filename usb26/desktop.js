/* Purdue USB desktop (Windows XP).
   Wide screens: a window manager (many windows; drag, resize, minimize, maximize, close).
   Narrow screens: one window at a time. With no JS every section is simply shown, stacked.
   Data (board roster, Instagram posts) comes from data.js; icons from icons.js. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var mq = window.matchMedia("(min-width: 900px) and (min-height: 540px)");
  var root = document.documentElement;
  var wins = $$(".win[data-task]");
  var byId = {};
  wins.forEach(function (w) { byId[w.id] = w; });
  var tasks = $$(".task");
  var icons = $$(".icon");
  var empty = $("#empty");
  var wm = false;      // window-manager mode (wide screens)
  var current = null;  // single-window mode: the open window
  var maxed = null;    // single-window mode: the maximized window
  var active = null;   // window-manager mode: the focused window
  var zTop = 10;
  var DEF = { about: [1000, 660], board: [1000, 660], contact: [840, 660], connect: [980, 640], initiatives: [1000, 640] };
  var data = window.USB_DATA || {};

  function store(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      if (val === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, val);
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
  function svg(id) { return '<svg class="ico" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function setStatus(w, text) { var s = $(".sb-main", w); if (s) s.textContent = text; }

  /* ----- Tray balloon ----- */
  function notice(title, text, ms) {
    var old = $(".balloon");
    if (old) old.remove();
    var b = el("div", "", "balloon");
    b.setAttribute("role", "status");
    var x = el("button", "×", "balloon-x");
    x.type = "button";
    x.setAttribute("aria-label", "Dismiss");
    var h = el("strong");
    h.innerHTML = svg("i-info");
    h.appendChild(document.createTextNode(title));
    b.appendChild(x);
    b.appendChild(h);
    b.appendChild(el("p", text));
    document.body.appendChild(b);
    var t = setTimeout(close, ms || 9000);
    function close() { clearTimeout(t); b.remove(); }
    x.addEventListener("click", close);
  }
  /* DESIGN-PREVIEW ONLY: this project builds the homepage only, so pages on other routes show a
     notice. On the real site these are ordinary links (or router navigation). */
  function go(href, name) {
    if (/^[\w\-./]+\.html($|[?#])/.test(href)) location.href = href;
    else if (/^https?:|^mailto:/.test(href)) window.open(href, "_blank", "noopener");
    else notice("Design preview", name + " isn't part of this preview yet. Only the homepage is built.", 6000);
  }

  /* ----- Board roster, former members, Instagram posts ----- */
  function markSelected(list, node) {
    $$(".item", list).forEach(function (x) {
      x.classList.remove("sel");
      if (x.tagName === "BUTTON") x.setAttribute("aria-pressed", "false");
    });
    node.classList.add("sel");
    if (node.tagName === "BUTTON") node.setAttribute("aria-pressed", "true");
  }
  function renderBoard(r) {
    r = r || data.roster || {};
    var list = $("#members");
    var members = r.members || [];
    var w = byId.board;
    if (list) {
      list.textContent = "";
      members.forEach(function (m) {
        var li = el("li");
        var b = el("button", "", "item");
        b.type = "button";
        b.setAttribute("aria-pressed", "false");
        b.dataset.name = m.name;
        if (m.title) b.dataset.role = m.title;
        if (m["class"]) b.dataset.year = m["class"];
        if (m.site) b.dataset.url = m.site;
        if (m.initiatives) b.dataset.inits = JSON.stringify(m.initiatives);
        var av = el("span", "", "avatar");
        if (m.photo) {
          var pic = document.createElement("picture");
          ["avif", "webp"].forEach(function (t) {
            var s = el("source");
            s.type = "image/" + t;
            s.srcset = m.photo + "-256." + t + " 1x, " + m.photo + "-512." + t + " 2x";
            pic.appendChild(s);
          });
          var im = el("img");
          im.src = m.photo + "-256.webp";
          im.alt = "";
          im.width = 64; im.height = 64;
          im.loading = "lazy";
          im.addEventListener("error", function () { av.textContent = ""; av.innerHTML = svg("i-user"); });
          pic.appendChild(im);
          av.appendChild(pic);
        } else av.innerHTML = svg("i-user");
        b.appendChild(av);
        b.appendChild(el("span", m.name, "lbl"));
        if (m.title) b.appendChild(el("span", m.title, "fmeta"));
        if (m["class"]) b.appendChild(el("span", m["class"], "fmeta"));
        li.appendChild(b);
        list.appendChild(li);
      });
      if (list._wired) return renderFormer(r);
      list._wired = true;
      list.addEventListener("click", function (e) {
        var b = e.target.closest(".item");
        if (!b) return;
        markSelected(list, b);
        var d = $("#details");
        d.textContent = "";
        d.appendChild(el("h3", b.dataset.name));
        if (b.dataset.role) d.appendChild(el("p", b.dataset.role));
        if (b.dataset.year) d.appendChild(el("p", "Class: " + b.dataset.year));
        if (b.dataset.inits) {
          var ih = el("h4", "Initiatives", "pinit-h");
          d.appendChild(ih);
          var ul = el("ul", "", "pinit");
          JSON.parse(b.dataset.inits).forEach(function (i) {
            var li = el("li");
            li.appendChild(el("span", i.name));
            li.appendChild(el("span", i.role, "pbadge" + (i.role === "Lead" ? " lead" : "")));
            ul.appendChild(li);
          });
          d.appendChild(ul);
        }
        if (b.dataset.url) { var a = ext(el("a", "View profile", "btn")); a.href = b.dataset.url; d.appendChild(a); }
        setStatus(w, b.dataset.name);
      });
    }
    renderFormer(r);
  }
  function renderFormer(r) {
    var ul = $(".alumni");
    if (ul) {
      ul.textContent = "";
      (r.former || []).forEach(function (m) {
        var li = el("li");
        var av = el("span", "", "avatar");
        av.innerHTML = svg("i-user");
        li.appendChild(av);
        var tx = el("span", "", "atext");
        if (m.site) { var a = ext(el("a", m.name)); a.href = m.site; tx.appendChild(a); }
        else tx.appendChild(el("span", m.name, "aname"));
        if (m.title) tx.appendChild(el("span", m.title, "role"));
        if (m["class"]) tx.appendChild(el("span", "Class of " + m["class"], "yr"));
        li.appendChild(tx);
        ul.appendChild(li);
      });
    }
  }
  function ago(ts) {
    var h = Math.floor((Date.now() - new Date(ts)) / 36e5);
    if (!(h >= 0)) return "";
    return h < 24 ? h + " hours ago" : Math.floor(h / 24) + " days ago";
  }
  function renderPosts(posts) {
    var box = $(".slides");
    if (!box) return;
    box.textContent = "";
    (posts || data.posts || []).forEach(function (p) {
      var a = el("article", "", "post");
      var head = el("header", "", "post-head");
      head.innerHTML = '<img class="brandimg" src="assets/brand/usb-icon.webp" alt="" width="30" height="30">' + "<div><strong>purdueusb</strong><span>Purdue USB</span></div>";
      var img;
      if (p.image) {
        img = el("div", "", "post-img has-img");
        var pi = el("img");
        pi.src = p.image;
        pi.alt = "Instagram post: " + (p.eventTitle || "image");
        pi.width = p.w || 864; pi.height = p.h || 1080;
        pi.loading = "lazy";
        img.appendChild(pi);
      } else {
        img = el("div", p.eventTitle || "Instagram post", "post-img");
        img.setAttribute("role", "img");
        img.setAttribute("aria-label", "Instagram post: " + (p.eventTitle || "image") + " (image placeholder)");
      }
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
    if (box._wired) return;
    box._wired = true;
    if (prev) prev.addEventListener("click", function () { by(-1); });
    if (next) next.addEventListener("click", function () { by(1); });
  }

  /* ----- Initiatives folder: select an item to read about it; double-click (or Open) to go ----- */
  function setupInitiatives() {
    var list = $("#initiative-list");
    if (!list) return;
    var w = byId.initiatives;
    function openItem(a) { go(a.getAttribute("href"), a.dataset.name); }
    function show(a) {
      markSelected(list, a);
      var d = $("#idetails");
      d.textContent = "";
      d.appendChild(el("h3", a.dataset.name));
      d.appendChild(el("p", a.dataset.desc));
      var open = el("button", "Open", "btn default");
      open.type = "button";
      open.addEventListener("click", function () { openItem(a); });
      d.appendChild(open);
      setStatus(w, a.dataset.name);
    }
    list.addEventListener("click", function (e) {
      var a = e.target.closest(".item");
      if (!a) return;
      e.preventDefault();
      show(a);
      if (coarse || !wm || e.detail === 0) openItem(a);
    });
    list.addEventListener("dblclick", function (e) {
      var a = e.target.closest(".item");
      if (a) { e.preventDefault(); openItem(a); }
    });
  }

  /* ----- Contact form (preview: nothing is sent) ----- */
  var form = $("#cform");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    notice("Design preview", "Messages are not sent from this preview. On the real site this form posts to Formspree.", 7000);
  });
  var yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ----- Clock ----- */
  var clock = $("#clock");
  function tick() { if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  tick();
  setInterval(tick, 15000);

  /* ----- Start menu ----- */
  var sb = $("#start");
  var sm = $("#startmenu");
  function setMenu(open) {
    if (!sb || !sm) return;
    sm.hidden = !open;
    sb.setAttribute("aria-expanded", String(open));
  }
  if (sb && sm) sb.addEventListener("click", function (e) { e.stopPropagation(); setMenu(sm.hidden); });

  /* ----- Shared window helpers ----- */
  var alias = { "/initiatives": "initiatives" };
  function appOf(href) {
    if (!href) return null;
    if (href.charAt(0) === "#") return byId[href.slice(1)] ? href.slice(1) : null;
    if (href.charAt(0) === "/" && href.indexOf("//") !== 0) return alias[href.split(/[?#]/)[0].replace(/\/$/, "")] || null;
    return null;
  }
  function replay(w) { w.classList.remove("opening"); void w.offsetWidth; w.classList.add("opening"); }
  function setMax(w, on) {
    w.classList.toggle("max", on);
    if (!wm) { document.body.classList.toggle("has-max", on); maxed = on ? w : null; }
    var b = $(".max", w);
    if (b) b.setAttribute("aria-label", on ? "Restore down" : "Maximize");
  }
  function openWins() { return wins.filter(function (x) { return x._s === "open"; }); }
  function sync() {
    if (wm) {
      tasks.forEach(function (t) {
        var w = byId[appOf(t.getAttribute("href"))];
        if (!w) return;
        t.hidden = w._s !== "open" && w._s !== "min";
        t.setAttribute("aria-current", active === w && w._s === "open" ? "true" : "false");
        t.classList.toggle("is-min", w._s === "min");
      });
      root.classList.toggle("empty-desk", !openWins().length);
      return;
    }
    var id = current && current.id;
    tasks.forEach(function (t) {
      t.hidden = false;
      t.setAttribute("aria-current", id && appOf(t.getAttribute("href")) === id ? "true" : "false");
    });
    if (empty) empty.hidden = !!current;
  }

  /* ----- Single-window mode (narrow screens) ----- */
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
    if (o.history === true) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* ignore */ } }
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
    w.style.left = g.x + "px"; w.style.top = g.y + "px";
    w.style.width = g.w + "px"; w.style.height = g.h + "px";
  }
  function place(w, i) {
    var b = bounds(), d = DEF[w.id] || [860, 560];
    var gw = Math.max(360, Math.min(d[0], b.w - 150));
    var gh = Math.max(260, Math.min(d[1], b.h - 28));
    w._g = { w: gw, h: gh, x: Math.min(140 + i * 30, Math.max(0, b.w - gw - 12)), y: Math.min(22 + i * 28, Math.max(0, b.h - gh - 12)) };
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
    if (reduce) done(); else { w.classList.add("minimizing"); w._t = setTimeout(done, 190); }
    sync();
  }
  function enterWM(startId) {
    wm = true;
    root.classList.add("wm");
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
    var id = active ? active.id : null;
    wm = false;
    active = null;
    root.classList.remove("wm", "empty-desk");
    wins.forEach(function (w) {
      ["left", "top", "width", "height", "zIndex"].forEach(function (p) { w.style[p] = ""; });
      w.classList.remove("active", "max", "minimizing");
      w.hidden = true;
      w._s = "closed";
    });
    $$(".titlebar").forEach(function (t) { t.removeAttribute("tabindex"); t.removeAttribute("title"); });
    if (id) openApp(id, { quiet: true, history: false }); else sync();
  }
  function openAny(id, o) { if (wm) wmOpen(id, o); else openApp(id, o); }
  function closeWin(w) { if (wm) wmHide(w, "closed"); else closeApp(); }
  function closeAll() {
    if (wm) {
      wins.forEach(function (w) { clearTimeout(w._t); if (w.classList.contains("max")) setMax(w, false); w.hidden = true; w.classList.remove("minimizing", "active"); w._s = "closed"; });
      active = null;
      sync();
    } else closeApp();
  }

  /* ----- Explorer chrome (menu bar, toolbar, address bar, status bar), controls, drag, resize ----- */
  var openMenu = null;
  function closeMenus() {
    $$(".menu").forEach(function (m) { m.hidden = true; });
    $$(".mb").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    openMenu = null;
  }
  function buildChrome(w) {
    var bar = $(".titlebar", w), inner = $(".win-inner", w), icon = w.dataset.icon || "i-flag";

    var ctl = el("div", "", "ctl");
    ctl.innerHTML =
      '<button type="button" class="min" aria-label="Minimize to the taskbar"><span class="g"></span></button>' +
      '<button type="button" class="max" aria-label="Maximize"><span class="g"></span></button>' +
      '<button type="button" class="close" aria-label="Close"><span class="g"></span></button>';
    bar.appendChild(ctl);

    var mb = el("div", "", "menubar");
    var defs = [
      ["File", [["Close", function () { closeWin(w); }]]],
      ["View", [["Maximize / Restore", function () { setMax(w, !w.classList.contains("max")); }]]]
    ];
    defs.forEach(function (d) {
      var wrap = el("div", "", "mbwrap");
      var btn = el("button", d[0], "mb");
      btn.type = "button";
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");
      var ul = el("ul", "", "menu");
      ul.hidden = true;
      d[1].forEach(function (it) {
        var li = el("li"), b = el("button", it[0]);
        b.type = "button";
        b.addEventListener("click", function () { closeMenus(); it[1](); });
        li.appendChild(b);
        ul.appendChild(li);
      });
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var wasOpen = !ul.hidden;
        closeMenus();
        if (!wasOpen) { ul.hidden = false; btn.setAttribute("aria-expanded", "true"); openMenu = ul; }
      });
      wrap.appendChild(btn);
      wrap.appendChild(ul);
      mb.appendChild(wrap);
    });
    var logo = el("span", "", "mb-logo");
    logo.innerHTML = svg("i-flag");
    mb.appendChild(logo);

    var mail = w.dataset.chrome === "mail";
    var tb = el("div", "", "toolbar");
    (w.dataset.tools || "").split(";").forEach(function (t) {
      if (t === "-") { tb.appendChild(el("span", "", "tsep")); return; }
      var p = t.split("|");
      if (p.length < 3) return;
      var isBtn = p[1] === "#send" || p[1] === "#reset";
      var a = el(isBtn ? "button" : "a", "", "tbtn" + (p[1] === "#send" ? " tsend" : ""));
      if (isBtn) { a.type = p[1] === "#send" ? "submit" : "reset"; a.setAttribute("form", "cform"); } else a.href = p[1];
      a.innerHTML = svg(p[2]);
      a.appendChild(document.createTextNode(p[0]));
      tb.appendChild(a);
    });

    var ab = el("div", "", "addressbar");
    ab.innerHTML = "<span>Address</span>";
    var box = el("div", "", "addr-box");
    box.innerHTML = svg(icon);
    box.appendChild(el("span", w.dataset.address || ""));
    ab.appendChild(box);
    var go_ = el("span", "", "go");
    go_.innerHTML = '<span class="tarr">→</span>Go';
    ab.appendChild(go_);

    var st = el("div", "", "statusbar");
    st.appendChild(el("span", w.dataset.status || "Ready", "sb-main"));
    st.appendChild(el("span", w.dataset.side || "Purdue USB", "sb-side"));

    w.insertBefore(mb, inner);
    if (tb.children.length) w.insertBefore(tb, inner);
    if (!mail) w.insertBefore(ab, inner);
    w.appendChild(st);

    $(".min", ctl).addEventListener("click", function () { if (wm) wmHide(w, "min"); else closeApp(); });
    $(".close", ctl).addEventListener("click", function () { closeWin(w); });
    $(".max", ctl).addEventListener("click", function () { setMax(w, !w.classList.contains("max")); });
    bar.addEventListener("dblclick", function (e) { if (!ctl.contains(e.target)) setMax(w, !w.classList.contains("max")); });

    /* focus on any press inside the window */
    w.addEventListener("pointerdown", function () { if (wm && active !== w) wmFocus(w); }, true);

    /* drag by the title bar; cancelling mousedown stops text from being selected */
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
      } else if (e.key === "Enter") { e.preventDefault(); setMax(w, !w.classList.contains("max")); }
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
        g.h = clamp(oh + ev.clientY - sy, 260, Math.max(260, b.h - g.y));
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
  }

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

  /* ----- Desktop icons: click selects, double-click opens (a single tap opens on touch) ----- */
  function selectIcon(i) { $$(".icon.sel").forEach(function (x) { x.classList.remove("sel"); }); if (i) i.classList.add("sel"); }
  function openIcon(i) {
    var href = i.getAttribute("href"), id = appOf(href);
    if (id) openAny(id, { focus: true });
    else go(href, i.textContent.trim());  // shortcut icons: pages outside the desktop windows
  }
  icons.forEach(function (i) {
    i.addEventListener("click", function (e) {
      e.preventDefault();
      selectIcon(i);
      i.classList.remove("hint");
      if (coarse || !wm || e.detail === 0) openIcon(i);
    });
    i.addEventListener("dblclick", function (e) { e.preventDefault(); openIcon(i); });
  });

  /* ----- Start menu actions, shared links, keyboard ----- */
  var shutdown = $("#shutdown");
  if (shutdown) shutdown.addEventListener("click", function () { setMenu(false); closeAll(); });

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : e.target.parentNode;
    if (sm && !sm.hidden && !sm.contains(t) && t !== sb && !sb.contains(t)) setMenu(false);
    if (openMenu && !t.closest(".mbwrap")) closeMenus();
    if (!t.closest(".icon")) selectIcon(null);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
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
      go(href, a.getAttribute("data-label") || a.textContent.replace(/\s+/g, " ").trim() || href);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (openMenu) closeMenus();
    else if (sm && !sm.hidden) { setMenu(false); if (sb) sb.focus(); }
    else if (wm && active && active.classList.contains("max")) setMax(active, false);
    else if (!wm && maxed) setMax(maxed, false);
  });
  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (!byId[id]) return;
    if (wm) wmOpen(id, { focus: true }); else if (byId[id] !== current) openApp(id, { history: false });
  });

  /* ----- Birds in the sky: they flap, bob and glide slowly. With "reduce motion" they stay still. ----- */
  (function birds() {
    var NS = "http://www.w3.org/2000/svg";
    // x, y (wallpaper coordinates), size, glide seconds, bob seconds, flap seconds
    var flock = [[640, 300, 1, 46, 6.5, 1.7], [690, 320, 0.8, 52, 7.5, 1.5], [1100, 230, 0.7, 40, 5.5, 1.4], [1140, 250, 0.6, 58, 8, 1.3], [1400, 420, 0.6, 44, 6, 1.35]];
    var layer = document.createElementNS(NS, "svg");
    layer.setAttribute("class", "birds");
    layer.setAttribute("viewBox", "0 0 1920 1080");
    layer.setAttribute("preserveAspectRatio", "xMidYMax slice");
    layer.setAttribute("aria-hidden", "true");
    flock.forEach(function (b, i) {
      var s = b[2];
      function wing(up, mid, down) { return "M0 0q" + 12 * s + " " + up * s + " " + 24 * s + " " + mid * s + "q" + 12 * s + " " + down * s + " " + 24 * s + " " + -mid * s; }
      var rest = wing(-10, 0, -10);
      var glide = document.createElementNS(NS, "g");
      glide.setAttribute("class", "bird-glide");
      glide.style.setProperty("--dur", b[3] + "s");
      glide.style.setProperty("--delay", "-" + (b[3] * (0.15 + i * 0.17)).toFixed(1) + "s");
      var bob = document.createElementNS(NS, "g");
      bob.setAttribute("class", "bird-bob");
      bob.style.setProperty("--dur", b[4] + "s");
      bob.style.setProperty("--delay", "-" + (i * 1.3).toFixed(1) + "s");
      var at = document.createElementNS(NS, "g");
      at.setAttribute("transform", "translate(" + b[0] + " " + b[1] + ")");
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", rest);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "#27487d");
      p.setAttribute("stroke-opacity", "0.55");
      p.setAttribute("stroke-width", "2");
      p.setAttribute("stroke-linecap", "round");
      if (!reduce) {
        var a = document.createElementNS(NS, "animate");
        a.setAttribute("attributeName", "d");
        a.setAttribute("dur", b[5] + "s");
        a.setAttribute("begin", "-" + (i * 0.4).toFixed(1) + "s");
        a.setAttribute("repeatCount", "indefinite");
        a.setAttribute("values", [wing(-14, -4, -9), rest, wing(-4, 3, -7), rest, wing(-14, -4, -9)].join(";"));
        p.appendChild(a);
      }
      at.appendChild(p);
      bob.appendChild(at);
      glide.appendChild(bob);
      layer.appendChild(glide);
    });
    document.body.insertBefore(layer, $(".desk"));
  })();

  /* ----- CRT screen effect (on by default; the tray button turns it off, and the choice is remembered) ----- */
  var crtBtn = $("#crt");
  var crtLayer = el("div", "", "crt");
  crtLayer.setAttribute("aria-hidden", "true");
  crtLayer.innerHTML = '<div class="crt-lines"></div><div class="crt-noise"></div><div class="crt-vignette"></div><div class="crt-flicker"></div>';
  document.body.appendChild(crtLayer);
  function crtSet(on, save) {
    root.classList.toggle("crt-on", on);
    if (crtBtn) {
      crtBtn.setAttribute("aria-pressed", String(on));
      crtBtn.title = "CRT screen effect: " + (on ? "on (click to turn off)" : "off (click to turn on)");
    }
    if (save) { try { localStorage.setItem("usb-crt", on ? "on" : "off"); } catch (e) { /* ignore */ } }
  }
  var crtPref = null;
  try { crtPref = localStorage.getItem("usb-crt"); } catch (e) { /* ignore */ }
  crtSet(crtPref !== "off", false);
  if (crtBtn) crtBtn.addEventListener("click", function () { crtSet(!root.classList.contains("crt-on"), true); });


  /* ----- Live data: the page paints from the bundled snapshot (data.js), then swaps in the same sources the React site uses.
     Any failure leaves the snapshot in place. ----- */
  function getJson(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 8000) : null;
    return fetch(url, { credentials: "omit", signal: ctl ? ctl.signal : undefined }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }
  function liveBoard() {
    return getJson("/Board Member Photos/board-members.json").then(function (b) {
      if (!b || !Array.isArray(b.members) || !b.members.length) throw new Error("no members");
      var ov = data.overrides || {};
      var members = b.members.map(function (m) {
        var o = ov[m.name] || {};
        return {
          name: m.name,
          title: o.title || m.title || "",
          "class": m["class"] || "",
          site: o.site || m.site || "",
          photo: m.srcBase || "",
          initiatives: o.initiatives
        };
      });
      var former = (b.alumni || []).map(function (m) { return { name: m.name, title: m.title || "", "class": m["class"] || "", site: m.site || "" }; });
      renderBoard({ members: members, former: former });
      var w = byId.board;
      if (w) setStatus(w, members.length + " object(s)");
    });
  }
  function livePosts() {
    function map(rows) {
      return (Array.isArray(rows) ? rows : []).map(function (p) {
        return { id: p.id, caption: p.caption || "", timestamp: p.timestamp, permalink: p.permalink || "https://www.instagram.com/purdueusb/",
          eventTitle: p.eventTitle, image: p.imageUrl || p.image || null, w: p.width || p.w, h: p.height || p.h };
      }).filter(function (p) { return p.image; }).slice(0, 6);
    }
    return getJson("/api/instagram/posts").then(function (d) {
      var posts = map(d && d.posts);
      if (!posts.length) throw new Error("API returned no posts");
      return posts;
    }).catch(function () {
      return getJson("/Instagram Posts/insta_posts.json").then(function (d) {
        var posts = map(d);
        if (!posts.length) throw new Error("no fallback posts");
        return posts;
      });
    }).then(function (posts) { renderPosts(posts); });
  }
  function loadLive() {
    if (!/^https?:$/.test(location.protocol)) return;
    liveBoard().catch(function () { /* keep the snapshot */ });
    livePosts().catch(function () { /* keep the snapshot */ });
  }

  /* ----- Start up ----- */
  function welcomeBalloon() {
    if (reduce) return;
    notice("Welcome to Purdue USB", coarse ? "Tap an icon to get started, or open the Start menu." : "Double-click an icon to get started, or open the Start menu.", 11000);
  }
  renderBoard();
  renderPosts();
  setupInitiatives();
  loadLive();
  wins.forEach(buildChrome);
  wins.forEach(function (w) { w._s = "closed"; });
  var hashId = location.hash && byId[location.hash.slice(1)] ? location.hash.slice(1) : null;
  if (mq.matches) enterWM(hashId); else if (hashId) openApp(hashId, { history: false, quiet: true }); else { wins.forEach(function (w) { w.hidden = true; }); sync(); }
  requestAnimationFrame(function () { window.scrollTo(0, 0); });
  var onMq = function (e) { if (e.matches && !wm) enterWM(current ? current.id : null); else if (!e.matches && wm) exitWM(); };
  if (mq.addEventListener) mq.addEventListener("change", onMq); else mq.addListener(onMq);
  if (!wm && current) replay(current);
  if (!store("usb-balloon")) { store("usb-balloon", "1"); setTimeout(welcomeBalloon, 900); }
})();
