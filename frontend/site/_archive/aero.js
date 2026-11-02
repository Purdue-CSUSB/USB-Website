/* Small, optional motion for the Aero skin. The page is fully usable without it. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var top = document.querySelector(".aero-top");
  if (top) {
    var onScroll = function () { top.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (reduce) return;

  // Drifting bubbles behind the content.
  var box = document.createElement("div");
  box.className = "aero-bubbles";
  box.setAttribute("aria-hidden", "true");
  var count = window.innerWidth < 700 ? 8 : 16;
  for (var i = 0; i < count; i++) {
    var b = document.createElement("span");
    var t = 20 + Math.random() * 22;
    b.className = "aero-bubble";
    b.style.setProperty("--s", (18 + Math.random() * 70).toFixed(0) + "px");
    b.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "vw");
    b.style.setProperty("--t", t.toFixed(1) + "s");
    b.style.setProperty("--delay", (-Math.random() * t).toFixed(1) + "s");
    b.style.setProperty("--sway", (Math.random() * 60 - 30).toFixed(0) + "px");
    box.appendChild(b);
  }
  document.body.appendChild(box);

  // Fade/rise sections and cards in as they scroll into view.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    var targets = document.querySelectorAll(
      ".section-title, .section-mission, .section-objectives, .objective, .flex--wrap > .animate, .card--initiative"
    );
    Array.prototype.forEach.call(targets, function (el, n) {
      el.classList.add("reveal");
      el.style.setProperty("--d", (n % 6) * 70 + "ms");
      io.observe(el);
    });
  }

  // Hero orb follows the pointer slightly.
  var hero = document.querySelector(".pb-10 > .bg-dark");
  if (hero && window.matchMedia("(pointer: fine)").matches) {
    var raf = 0;
    hero.addEventListener("pointermove", function (ev) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--px", (((ev.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        hero.style.setProperty("--py", (((ev.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
        raf = 0;
      });
    });
    hero.addEventListener("pointerleave", function () {
      hero.style.setProperty("--px", 0);
      hero.style.setProperty("--py", 0);
    });
  }
})();
