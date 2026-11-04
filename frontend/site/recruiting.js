/* Recruiting popup. Edit RECRUITING below each cycle; set enabled to false when recruiting ends.
   Shown once per browser session. Dates/link are placeholders until the team confirms them. */
(function () {
  var RECRUITING = {
    enabled: true,
    title: "Now Recruiting",
    callout: "Purdue USB is recruiting new board members! Help shape the CS student experience at Purdue.",
    details: "Open to all Purdue CS students. Pick the initiatives you care about and tell us why you'd be a great fit.",
    timeline: [
      { date: "TBA", label: "Applications open" },
      { date: "TBA", label: "Info session" },
      { date: "TBA", label: "Applications due" },
      { date: "TBA", label: "Interviews" },
      { date: "TBA", label: "Decisions announced" }
    ],
    applyUrl: "",   /* paste the application link here */
    applyLabel: "Apply Now",
    infoUrl: ""     /* optional: "Learn more" link */
  };

  var cfg = window.USB_RECRUITING || RECRUITING;
  if (!cfg.enabled) return;
  try { if (sessionStorage.getItem("usb-recruit")) return; } catch (e) { /* show anyway */ }

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function link(url, label, cls) {
    var a = el("a", label, cls);
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    return a;
  }

  var back = el("div", "", "rc-back");
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

  var body = el("div", "", "rc-body");
  body.appendChild(el("p", cfg.callout, "rc-call"));
  if (cfg.details) body.appendChild(el("p", cfg.details));
  if (cfg.timeline && cfg.timeline.length) {
    body.appendChild(el("h3", "Application timeline"));
    var ol = el("ol", "", "rc-time");
    cfg.timeline.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("b", s.date));
      li.appendChild(el("span", s.label));
      ol.appendChild(li);
    });
    body.appendChild(ol);
  }
  var row = el("div", "", "rc-btns");
  if (cfg.applyUrl) row.appendChild(link(cfg.applyUrl, cfg.applyLabel || "Apply Now", "btn default"));
  if (cfg.infoUrl) row.appendChild(link(cfg.infoUrl, "Learn more", "btn"));
  var later = el("button", cfg.applyUrl ? "Maybe later" : "Close", "btn");
  later.type = "button";
  row.appendChild(later);
  body.appendChild(row);
  dlg.appendChild(body);
  back.appendChild(dlg);

  var opener = null;
  function close() {
    document.removeEventListener("keydown", key, true);
    back.remove();
    try { sessionStorage.setItem("usb-recruit", "1"); } catch (e) { /* ignore */ }
    if (opener && opener.focus) opener.focus();
  }
  function key(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    var f = Array.prototype.slice.call(dlg.querySelectorAll("a[href], button"));
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  x.addEventListener("click", close);
  later.addEventListener("click", close);
  back.addEventListener("mousedown", function (e) { if (e.target === back) close(); });

  setTimeout(function () {
    opener = document.activeElement;
    document.body.appendChild(back);
    document.addEventListener("keydown", key, true);
    (dlg.querySelector(".btn.default") || later).focus();
  }, 500);
})();
