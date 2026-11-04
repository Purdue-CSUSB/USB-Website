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
})();
