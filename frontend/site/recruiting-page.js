/* Fills recruiting.html from recruiting-data.js. */
(function () {
  var c = window.USB_RECRUITING || {};
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, text, cls) { var n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; }
  $("rp-intro").textContent = c.intro || "";
  $("rp-who").textContent = c.who || "";
  var ol = $("rp-time");
  (c.timeline || []).forEach(function (s) {
    var li = el("li"); li.appendChild(el("b", s.date)); li.appendChild(el("span", s.label)); ol.appendChild(li);
  });
  var faq = $("rp-faq");
  (c.faqs || []).forEach(function (f) {
    var d = el("details"); d.appendChild(el("summary", f.q)); d.appendChild(el("p", f.a)); faq.appendChild(d);
  });
  var apply = $("rp-apply");
  if (c.applyUrl) { apply.href = c.applyUrl; apply.hidden = false; } else { $("rp-soon").hidden = false; }
  if (c.contact) { var m = $("rp-mail"); m.href = "mailto:" + c.contact; m.textContent = c.contact; }

  /* Meet the Board: the snapshot in data.js first, then the live roster (same sources as the homepage). */
  var list = $("rp-board");
  function renderBoard(members) {
    list.textContent = "";
    members.forEach(function (m) {
      var li = el("li");
      var av = el("span", "", "rp-av");
      if (m.photo) {
        var pic = document.createElement("picture");
        ["avif", "webp"].forEach(function (t) {
          var s = document.createElement("source");
          s.type = "image/" + t;
          s.srcset = m.photo + "-256." + t + " 1x, " + m.photo + "-512." + t + " 2x";
          pic.appendChild(s);
        });
        var im = document.createElement("img");
        im.src = m.photo + "-256.webp"; im.alt = ""; im.width = 96; im.height = 96; im.loading = "lazy";
        pic.appendChild(im);
        av.appendChild(pic);
      }
      li.appendChild(av);
      li.appendChild(el("strong", m.name));
      var meta = [m.title, m["class"]].filter(Boolean).join(" · ");
      if (meta) li.appendChild(el("span", meta, "rp-meta"));
      var leads = (m.initiatives || []).filter(function (i) { return i.role === "Lead"; }).map(function (i) { return i.name; });
      if (leads.length) li.appendChild(el("span", "Leads: " + leads.join(", "), "rp-leads"));
      list.appendChild(li);
    });
  }
  var data = window.USB_DATA || {};
  var snap = ((data.roster || {}).members || []).slice();
  renderBoard(snap);
  if (/^https?:$/.test(location.protocol)) {
    fetch("/Board Member Photos/board-members.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (b) {
      if (!b || !Array.isArray(b.members) || !b.members.length) return;
      var ov = data.overrides || {};
      renderBoard(b.members.map(function (m) {
        var o = ov[m.name] || {};
        return { name: m.name, title: o.title || m.title || "", "class": m["class"] || "", photo: m.srcBase || "", initiatives: o.initiatives };
      }));
    }).catch(function () { /* keep the snapshot */ });
  }
})();
