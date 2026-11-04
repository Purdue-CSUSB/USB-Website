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


  /* Flat retro desktop PC for the popup banner: beige CRT, tower, keyboard and mouse. */
  var PC = '<svg class="rc-pc" viewBox="0 0 150 110" focusable="false">' +
    '<defs><linearGradient id="rcp-bliss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fe0"/><stop offset=".55" stop-color="#a9d6ff"/><stop offset=".56" stop-color="#74c04f"/><stop offset="1" stop-color="#3b8f2c"/></linearGradient>' +
    '<linearGradient id="rcp-beige" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1ecda"/><stop offset="1" stop-color="#d8d1b8"/></linearGradient>' +
    '<clipPath id="rcp-clip"><rect x="49" y="15" width="58" height="40" rx="6"/></clipPath></defs>' +
    '<ellipse class="rc-shadow" cx="75" cy="105" rx="62" ry="4" fill="#1d4a12" opacity=".3"/>' +
    '<g class="rc-pcbob">' +
      /* tower */
      '<rect x="6" y="32" width="28" height="68" rx="3" fill="url(#rcp-beige)" stroke="#8a8470" stroke-width="1.2"/>' +
      '<rect x="11" y="40" width="18" height="4" rx="1" fill="#6f6a58"/><rect x="11" y="49" width="18" height="2.5" rx="1" fill="#6f6a58"/>' +
      '<rect x="11" y="56" width="18" height="2.5" rx="1" fill="#9a947e"/>' +
      '<circle cx="14" cy="90" r="2.6" fill="#c9c3ab" stroke="#8a8470"/><circle cx="24" cy="90" r="1.6" fill="#4cc23a"/>' +
      /* CRT monitor */
      '<rect x="42" y="6" width="74" height="62" rx="8" fill="url(#rcp-beige)" stroke="#8a8470" stroke-width="1.2"/>' +
      '<rect x="46" y="11" width="66" height="48" rx="5" fill="#3b3a34"/>' +
      '<g clip-path="url(#rcp-clip)"><rect x="49" y="15" width="58" height="40" fill="url(#rcp-bliss)"/>' +
        '<rect x="54" y="20" width="26" height="9" rx="1" fill="#ece9d8" stroke="#0a246a" stroke-width=".8"/><rect x="54" y="20" width="26" height="2.6" fill="#0a3fd8"/>' +
        '<rect x="57" y="25" width="14" height="1.4" fill="#7f95c4"/>' +
        '<rect class="rc-cur" x="73" y="24.6" width="3" height="2.2" fill="#0a246a"/>' +
        '<path d="M49 15h26l-14 40h-12z" fill="#fff" opacity=".12"/></g>' +
      '<rect x="49" y="15" width="58" height="40" rx="6" fill="none" stroke="#1d1c18" stroke-width="1.2"/>' +
      '<rect x="60" y="62" width="20" height="2.4" rx="1" fill="#f2b933"/><circle cx="104" cy="63" r="1.8" fill="#4cc23a"/>' +
      '<rect x="56" y="68" width="42" height="5" fill="#cfc8ae" stroke="#8a8470"/><rect x="48" y="73" width="58" height="6" rx="3" fill="url(#rcp-beige)" stroke="#8a8470"/>' +
      /* keyboard and mouse */
      '<rect x="40" y="86" width="78" height="16" rx="2.5" fill="url(#rcp-beige)" stroke="#8a8470" stroke-width="1.2"/>' +
      '<g stroke="#9a947e" stroke-width="2.4" stroke-dasharray="3.6 1.4" stroke-linecap="round"><line x1="44" y1="90" x2="114" y2="90"/><line x1="44" y1="94" x2="114" y2="94"/></g>' +
      '<rect x="60" y="97" width="38" height="3" rx="1" fill="#b9b299"/>' +
      '<path d="M118 94c8 0 8 4 12 4" fill="none" stroke="#8a8470" stroke-width="1"/>' +
      '<rect x="126" y="92" width="12" height="16" rx="6" fill="url(#rcp-beige)" stroke="#8a8470" stroke-width="1.2"/><path d="M132 92v7" stroke="#8a8470"/>' +
    '</g></svg>';

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
      PC;
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
