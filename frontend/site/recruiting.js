/* Recruiting popup on the homepage. Content comes from recruiting-data.js.
   Shown once per browser session; the tray icon and the Start menu entry reopen it. */
(function () {
  var cfg = window.USB_RECRUITING;
  if (!cfg || !cfg.enabled) return;

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function link(url, label, cls, ext) {
    var a = el("a", label, cls);
    a.href = url;
    if (ext) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  var back = null, opener = null;
  function remember() { try { sessionStorage.setItem("usb-recruit", "1"); } catch (e) { /* ignore */ } }
  function close() {
    if (!back) return;
    document.removeEventListener("keydown", key, true);
    back.remove();
    back = null;
    remember();
    if (opener && opener.focus) opener.focus();
    tip();
  }
  /* After the first close, point at the tray icon so people know how to get it back. */
  var tipShown = false, tipTimer = 0;
  function tip() {
    var btn = document.querySelector(".tray-btn[aria-label=Recruiting]");
    if (tipShown || !btn) return;
    tipShown = true;
    var old = document.querySelector(".balloon");
    if (old) old.remove();
    var b = el("div", "", "balloon rc-tip");
    b.setAttribute("role", "status");
    var r = btn.getBoundingClientRect();
    b.style.setProperty("--tail", Math.max(10, Math.round(window.innerWidth - (r.left + r.width / 2) - 12 - 7)) + "px");
    var x = el("button", "×", "balloon-x");
    x.type = "button";
    x.setAttribute("aria-label", "Dismiss");
    var h = el("strong");
    h.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-people"/></svg>';
    h.appendChild(document.createTextNode("Changed your mind?"));
    b.appendChild(x);
    b.appendChild(h);
    b.appendChild(el("p", "Click the recruiting icon down here any time to bring this back."));
    document.body.appendChild(b);
    btn.classList.add("rc-pulse");
    function done() { clearTimeout(tipTimer); b.remove(); btn.classList.remove("rc-pulse"); }
    tipTimer = setTimeout(done, 10000);
    x.addEventListener("click", done);
    btn.addEventListener("click", done, { once: true });
  }
  function key(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    var f = Array.prototype.slice.call(back.querySelectorAll("a[href], button"));
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function open() {
    if (back) return;
    opener = document.activeElement;
    back = el("div", "", "rc-back");
    var dlg = el("div", "", "rc");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.setAttribute("aria-labelledby", "rc-title");

    var bar = el("div", "", "titlebar");
    bar.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-people"/></svg>';
    var t = el("h2", cfg.title, "title");
    t.id = "rc-title";
    bar.appendChild(t);
    var ctl = el("div", "", "ctl");
    var x = el("button", "", "close");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.innerHTML = '<span class="g"></span>';
    ctl.appendChild(x);
    bar.appendChild(ctl);
    dlg.appendChild(bar);

    var hero = el("div", "", "rc-hero");
    hero.setAttribute("aria-hidden", "true");
    hero.innerHTML = '<span class="rc-spark s1"></span><span class="rc-spark s2"></span><span class="rc-spark s3"></span>' +
      '<svg class="rc-people"><use href="#i-people"/></svg>';
    dlg.appendChild(hero);

    var body = el("div", "", "rc-body");
    body.appendChild(el("p", cfg.callout, "rc-call"));
    if (cfg.blurb) body.appendChild(el("p", cfg.blurb));
    var row = el("div", "", "rc-btns");
    var more = link(cfg.pageUrl, "Learn more", "btn default");
    row.appendChild(more);
    if (cfg.applyUrl) row.appendChild(link(cfg.applyUrl, cfg.applyLabel || "Apply Now", "btn", true));
    var later = el("button", "Close", "btn");
    later.type = "button";
    row.appendChild(later);
    body.appendChild(row);
    dlg.appendChild(body);
    back.appendChild(dlg);

    x.addEventListener("click", close);
    later.addEventListener("click", close);
    more.addEventListener("click", remember);
    back.addEventListener("mousedown", function (e) { if (e.target === back) close(); });
    document.body.appendChild(back);
    document.addEventListener("keydown", key, true);
    more.focus();
  }

  /* Ways back in once it is closed: a tray icon and a Start menu entry. */
  var tray = document.querySelector(".tray");
  if (tray) {
    var b = el("button", "", "tray-btn");
    b.type = "button";
    b.title = "Recruiting: click to reopen";
    b.setAttribute("aria-label", "Recruiting");
    b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-people"/></svg>';
    b.addEventListener("click", function () { var sm = document.getElementById("startmenu"); if (sm) sm.hidden = true; open(); });
    tray.insertBefore(b, tray.firstChild);
  }
  var list = document.querySelector("#startmenu .sm-l ul");
  if (list) {
    var li = el("li");
    var a = el("a", "", "sm-i");
    a.href = "#recruiting";
    a.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-people"/></svg><span><strong>Now Recruiting</strong><small>Join the board</small></span>';
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var sm = document.getElementById("startmenu"); if (sm) sm.hidden = true;
      var s = document.getElementById("start"); if (s) s.setAttribute("aria-expanded", "false");
      open();
    });
    li.appendChild(a);
    list.insertBefore(li, list.firstChild);
  }

  var seen = false;
  try { seen = !!sessionStorage.getItem("usb-recruit"); } catch (e) { /* show anyway */ }
  if (!seen) setTimeout(open, 500);
})();
