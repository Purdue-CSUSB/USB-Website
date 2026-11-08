/* Fills recruiting.html from recruiting-data.js. */
(function () {
  var c = window.USB_RECRUITING || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, text, cls) { var n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; }
  function icon(id) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "ico");
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#" + id);
    s.appendChild(u);
    return s;
  }

  $("rp-intro").textContent = c.intro || "";
  var nx = c.next || {};
  $("rp-next-title").textContent = nx.heading || "";
  $("rp-when").textContent = [nx.when, nx.where].filter(Boolean).join(" · ");
  $("rp-next-note").textContent = nx.note || "";

  /* Apply buttons (hero and bottom) appear once an application link is set. */
  ["rp-apply", "rp-apply2"].forEach(function (id) {
    var a = $(id);
    if (c.applyUrl) { a.href = c.applyUrl; a.textContent = (c.applyLabel || "Apply Now") + " »"; a.hidden = false; }
  });
  if (c.contact) $("rp-mail").href = "mailto:" + c.contact;

  /* Steps */
  var steps = $("rp-steps");
  (c.steps || []).forEach(function (s) {
    var li = el("li");
    var ic = el("span", "", "rp-step-ico");
    ic.appendChild(icon(s.i || "i-info"));
    li.appendChild(ic);
    li.appendChild(el("strong", s.t));
    li.appendChild(el("span", s.d));
    steps.appendChild(li);
  });

  /* Timeline: dates still to come are drawn muted */
  var ol = $("rp-time");
  (c.timeline || []).forEach(function (s) {
    var li = el("li", "", /^to be/i.test(s.date) ? "tba" : "");
    li.appendChild(el("b", s.date));
    li.appendChild(el("span", s.label));
    ol.appendChild(li);
  });

  var faq = $("rp-faq");
  (c.faqs || []).forEach(function (f) {
    var d = el("details"); d.appendChild(el("summary", f.q)); d.appendChild(el("p", f.a)); faq.appendChild(d);
  });

  /* Hero countdown: until applications open, then until they close. It disappears after that. */
  var ap = c.applications || {};
  var opens = ap.opens ? new Date(ap.opens).getTime() : 0;
  var closes = ap.closes ? new Date(ap.closes).getTime() : 0;
  var box = $("rp-count");
  function tick() {
    var now = Date.now(), to = 0, label = "";
    if (opens && now < opens) { to = opens; label = "Applications open in"; }
    else if (closes && now < closes) { to = closes; label = "Applications close in"; }
    if (!to) { box.hidden = true; return false; }
    var secs = Math.floor((to - now) / 1000), m = Math.floor(secs / 60);
    $("rp-count-label").textContent = label;
    $("rp-d").textContent = Math.floor(m / 1440);
    $("rp-h").textContent = Math.floor((m % 1440) / 60);
    $("rp-m").textContent = m % 60;
    $("rp-s").textContent = secs % 60;
    box.hidden = false;
    return true;
  }
  if (tick()) setInterval(tick, 1000);

  /* Next-up card: an add-to-calendar file for the callout; the card goes away once it has passed. */
  if (nx.iso) {
    var start = new Date(nx.iso).getTime();
    if (!(start > Date.now())) document.querySelector(".rp-next").hidden = true;
    if (nx.endIso && start > Date.now() && window.Blob && window.URL) {
      var z = function (iso) { return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, ""); };
      var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Purdue USB//Recruiting//EN", "BEGIN:VEVENT",
        "UID:callout1-" + z(nx.iso) + "@purdueusb.com", "DTSTAMP:" + z(new Date().toISOString()),
        "DTSTART:" + z(nx.iso), "DTEND:" + z(nx.endIso), "SUMMARY:Purdue USB " + (nx.heading || "Callout"),
        "LOCATION:" + (nx.where || ""), "DESCRIPTION:Learn about Purdue USB and meet current board members.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      var cal = $("rp-cal");
      cal.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      cal.hidden = false;
    }
  }
})();
