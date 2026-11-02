/* Help Room: check in, then find which TAs are on at a given day and hour. */
(function () {
  "use strict";
  var D = window.HELP_ROOM;
  var checked = false;
  var $ = function (id) { return document.getElementById(id); };
  var daySel = $("sel-day"), hourSel = $("sel-hour"), results = $("results"), checkin = $("checkin");

  function fmt(h) {
    if (h === 12) return "12:00 PM";
    if (h === 0) return "12:00 AM";
    return h > 12 ? (h - 12) + ":00 PM" : h + ":00 AM";
  }
  function available(day, hour) {
    return D.taSchedule.filter(function (t) {
      return t.schedule.some(function (s) { return s.day === day && hour >= s.startHour && hour < s.endHour; });
    }).map(function (t) {
      var s = t.schedule.find(function (x) { return x.day === day && hour >= x.startHour && hour < x.endHour; });
      return { ta: t, type: s.type };
    });
  }
  function node(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function show() {
    var day = Number(daySel.value), hour = Number(hourSel.value);
    var dl = D.dayOptions.filter(function (d) { return d.value === day; })[0].label;
    var found = available(day, hour);
    results.textContent = "";
    results.appendChild(node("h3", "Available TAs for " + dl + ", " + fmt(hour) + " - " + fmt(hour + 1)));
    if (!found.length) {
      var e = node("div", "", "empty-note");
      e.appendChild(node("p", "No TAs available at this time."));
      e.appendChild(node("p", "Please try selecting a different day or time."));
      results.appendChild(e);
      results.dataset.has = "";
      return;
    }
    var grid = node("div", "", "ta-grid");
    found.forEach(function (f) {
      var t = f.ta, card = node("div", "", "ta");
      card.appendChild(node("h4", t.name));
      var m = node("a", t.email); m.href = "mailto:" + t.email; card.appendChild(m);
      var chips = node("ul", "", "chips");
      t.courses.forEach(function (c) { chips.appendChild(node("li", c)); });
      card.appendChild(chips);
      var virtual = f.type === "virtual";
      card.appendChild(node("span", virtual ? "Virtual" : "In person", "kind"));
      var b = node("button", checked ? (virtual ? "Join Zoom" : "In-Person – DSAI Lobby") : "Check in to join", "btn");
      b.type = "button";
      b.disabled = !checked;
      if (!checked) b.title = "Please check in first";
      b.addEventListener("click", function () {
        if (checked) window.open(virtual ? t.zoomLink : D.dsai, "_blank", "noopener");
      });
      card.appendChild(b);
      grid.appendChild(card);
    });
    results.appendChild(grid);
    results.dataset.has = "1";
  }
  function checkedIn() {
    checked = true;
    checkin.textContent = "";
    var h = node("div", "", "checked");
    h.appendChild(node("h2", "You’re Checked In"));
    checkin.appendChild(h);
    checkin.appendChild(node("p", "You can now join any available TA session below."));
    if (results.dataset.has !== undefined && results.textContent) show();
  }
  var cb = $("checkin-btn");
  if (cb) cb.addEventListener("click", function () { window.open(D.form, "_blank", "noopener"); checkedIn(); });
  $("find-btn").addEventListener("click", show);
})();
