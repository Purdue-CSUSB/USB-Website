/* Research Resources page: routing between the site's pages, the log-in / sign-up dialog,
   and the project board. Runs after desktop.js, which provides the window, taskbar and Start menu. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var D = window.USBDesktop || {};
  var pages = $$(".rr-page");
  var navLinks = $$(".rrnav a[data-route]");
  var content = $("#rr-content");
  var ROUTES = {
    "/": "home", "/faq": "faq", "/organizations-and-programs": "programs", "/cs-specific-research": "cs",
    "/presenting-your-research": "presenting", "/projects": "projects", "/calendar": "calendar"
  };

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  /* ----- Routing: #/faq, #/projects, ... ----- */
  function routeFromHash() {
    var h = location.hash.slice(1);
    if (h.charAt(0) !== "/") return null;
    return ROUTES[h.replace(/\/+$/, "") || "/"] || "home";
  }
  function show(route) {
    var title = "";
    pages.forEach(function (p) {
      var on = p.dataset.route === route;
      p.hidden = !on;
      if (on) title = p.dataset.title;
    });
    navLinks.forEach(function (a) {
      if (a.dataset.route === route) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var addr = $("#research .addr-box span");
    if (addr) addr.textContent = "Purdue USB\\Research Resources" + (route === "home" ? "" : "\\" + title);
    document.title = (route === "home" ? "" : title + " | ") + "Research Resources | Purdue USB";
    if (route === "calendar") {
      var f = $("iframe[data-src]");
      if (f && !f.getAttribute("src")) f.src = f.dataset.src;
    }
    if (content) content.scrollTop = 0;
  }
  window.addEventListener("hashchange", function () {
    var r = routeFromHash();
    if (!r) return;
    show(r);
    if (D.open) D.open("research", { focus: true });
  });

  /* ----- Log in / sign up dialog (nothing is sent from this preview) ----- */
  var dlg = $("#dlg");
  var opener = null;
  function setView(name) {
    var found = null;
    $$(".dview", dlg).forEach(function (v) {
      var on = v.dataset.view === name;
      v.hidden = !on;
      if (on) found = v;
    });
    $("#dlg-title").textContent = (found && found.dataset.title) || "Log In";
    var f = found && $("input, button", found);
    if (f) f.focus();
  }
  function openDlg(name, from) {
    opener = from || document.activeElement;
    dlg.hidden = false;
    setView(name);
  }
  function closeDlg() {
    dlg.hidden = true;
    var extra = $('.dview[data-view="project"]', dlg);
    if (extra) extra.remove();
    if (opener && opener.focus) opener.focus();
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : e.target.parentNode;
    var o = t.closest("[data-dialog]");
    if (o) { e.preventDefault(); openDlg(o.getAttribute("data-dialog"), o); return; }
    var vl = t.closest("[data-view-link]");
    if (vl) { e.preventDefault(); setView(vl.getAttribute("data-view-link")); return; }
    if (t.closest("[data-close]") || t.closest(".dlg-x") || t === dlg) closeDlg();
  });
  document.addEventListener("keydown", function (e) {
    if (dlg.hidden) return;
    if (e.key === "Escape") { e.stopPropagation(); closeDlg(); return; }
    if (e.key !== "Tab") return;
    var f = $$("input, button, a[href]", dlg).filter(function (n) { return n.offsetParent !== null && !n.disabled; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);
  dlg.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = "Accounts and posting projects need the Research Resources backend, which is not connected in this preview.";
    if (D.notice) D.notice("Design preview", msg, 7000);
    closeDlg();
  });

  /* ----- Project board: renders window.RESEARCH_PROJECTS (the live board is empty right now) ----- */
  function mailto(p) {
    if (!p.contactEmail) return null;
    var body = "Hi " + p.manager + ",\r\n\r\nI am interested in joining your research team for the " + p.title +
      " project. Please find my resume attached to this email.\r\n\r\n--- My Details ---\r\nName: \r\nMajor & Year: \r\n\r\n" +
      "Why I'm a good fit:\r\n[Write a brief sentence here about your experience or interest]\r\n";
    return "mailto:" + p.contactEmail + "?subject=" + encodeURIComponent("Application: " + p.title) + "&body=" + encodeURIComponent(body);
  }
  function chips(list, max) {
    var ul = el("ul", "", "pj-chips");
    list.slice(0, max || list.length).forEach(function (t) { ul.appendChild(el("li", t)); });
    if (max && list.length > max) ul.appendChild(el("li", "+" + (list.length - max)));
    return ul;
  }
  function stats(p, withContact) {
    var dl = el("dl", "", "pj-stats");
    [["Roles Needed", p.rolesNeeded], ["Time (Weekly)", p.timeCommitment], ["Compensation", p.compensation, true]]
      .concat(withContact ? [["Contact", p.contactEmail, true]] : [])
      .forEach(function (s) {
        if (!s[1]) return;
        var wrap = el("div", "", s[2] ? "wide" : "");
        wrap.appendChild(el("dt", s[0]));
        wrap.appendChild(el("dd", s[1]));
        dl.appendChild(wrap);
      });
    return dl;
  }
  function showProject(p) {
    var old = $('.dview[data-view="project"]', dlg);
    if (old) old.remove();
    var v = el("div", "", "dview pd");
    v.dataset.view = "project";
    v.dataset.title = p.title;
    v.appendChild(el("p", "Led by " + p.manager + (p.deadline ? " • Until " + p.deadline : "")));
    v.appendChild(el("h3", "About This Project"));
    v.appendChild(el("p", p.description));
    if (p.requirements) { v.appendChild(el("h3", "Role Requirements")); v.appendChild(el("p", p.requirements)); }
    if (p.techStack && p.techStack.length) { v.appendChild(el("h3", "Tech Stack")); v.appendChild(chips(p.techStack)); }
    v.appendChild(el("h3", "At A Glance"));
    v.appendChild(stats(p, true));
    var row = el("div", "", "dbtns");
    var m = mailto(p);
    if (m) { var a = el("a", "Apply via Email", "btn default"); a.href = m; row.appendChild(a); }
    var close = el("button", "Close", "btn");
    close.type = "button";
    close.setAttribute("data-close", "");
    row.appendChild(close);
    v.appendChild(row);
    $(".dlg-body", dlg).appendChild(v);
    opener = document.activeElement;
    dlg.hidden = false;
    setView("project");
  }
  function renderProjects() {
    var list = window.RESEARCH_PROJECTS || [];
    var board = $("#project-board"), empty = $("#project-empty");
    if (empty) empty.hidden = list.length > 0;
    if (!board) return;
    list.forEach(function (p) {
      var c = el("article", "", "rr-card pj");
      c.appendChild(el("h3", p.title));
      if (p.deadline) c.appendChild(el("span", "Until " + p.deadline, "pj-until"));
      c.appendChild(el("p", p.description));
      var more = el("button", "View details", "linkbtn");
      more.type = "button";
      more.addEventListener("click", function () { showProject(p); });
      c.appendChild(more);
      if (p.techStack && p.techStack.length) { c.appendChild(el("h4", "Tech Stack")); c.appendChild(chips(p.techStack, 4)); }
      c.appendChild(stats(p, false));
      c.appendChild(el("p", "Led by: " + p.manager));
      var m = mailto(p);
      if (m) { var a = el("a", "Apply via Email", "btn default"); a.href = m; c.appendChild(a); }
      board.appendChild(c);
    });
  }

  $$(".rr-year").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  renderProjects();
  show(routeFromHash() || "home");
})();
