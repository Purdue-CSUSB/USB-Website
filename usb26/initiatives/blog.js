/* Blog: the list and every post live in this page; the #/slug part of the address picks which one shows. */
(function () {
  "use strict";
  var list = document.getElementById("bloglist");
  var posts = Array.prototype.slice.call(document.querySelectorAll(".post"));
  var crumb = document.getElementById("crumb-page");
  function route() {
    var slug = (location.hash || "").replace(/^#\/?/, "");
    var hit = null;
    posts.forEach(function (p) {
      var on = p.getAttribute("data-slug") === slug;
      p.hidden = !on;
      if (on) hit = p;
    });
    list.hidden = !!hit;
    var t = hit ? hit.getAttribute("data-title") : "Blog";
    if (crumb) crumb.textContent = hit ? "Blog » " + t : "Blog";
    document.title = t + " | Purdue USB";
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
