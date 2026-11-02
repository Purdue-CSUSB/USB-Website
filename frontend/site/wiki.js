/* Student Wiki: list with search and category filter, plus the articles (shown by the #/slug part of the address). */
(function () {
  "use strict";
  var list = document.getElementById("bloglist");
  var posts = Array.prototype.slice.call(document.querySelectorAll(".post"));
  var crumb = document.getElementById("crumb-page");
  var q = document.getElementById("wiki-q");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".postlist > li"));
  var count = document.getElementById("wiki-count");
  var none = document.getElementById("wiki-none");
  var TEXT = window.WIKI_TEXT || {};
  var cat = "";

  function filter() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (li) {
      var hay = TEXT[li.getAttribute("data-slug")] || li.textContent.toLowerCase();
      var okText = words.every(function (w) { return hay.indexOf(w) !== -1; });
      var okCat = !cat || li.getAttribute("data-cats").split("|").indexOf(cat) !== -1;
      var on = okText && okCat;
      li.hidden = !on;
      if (on) shown++;
    });
    count.textContent = shown + (shown === 1 ? " article" : " articles");
    none.hidden = shown !== 0;
  }
  q.addEventListener("input", filter);
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      cat = c.getAttribute("data-cat");
      chips.forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
      filter();
    });
  });

  function route() {
    var fromPath = location.pathname.match(/\/student-wiki\/([^\/]+)\/?$/);
    var slug = (location.hash || "").replace(/^#\/?/, "") || (fromPath ? decodeURIComponent(fromPath[1]) : "");
    var hit = null;
    posts.forEach(function (p) {
      var on = p.getAttribute("data-slug") === slug;
      p.hidden = !on;
      if (on) hit = p;
    });
    list.hidden = !!hit;
    var t = hit ? hit.getAttribute("data-title") : "All articles";
    if (crumb) crumb.textContent = t;
    document.title = (hit ? t : "Student Wiki") + " | Purdue USB";
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  filter();
})();
