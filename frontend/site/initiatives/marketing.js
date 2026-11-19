/* Marketing page: the newest Instagram posts as a photo grid, from the same live feed as the desktop's Stay Connected window.
   Order: /api/instagram/posts, then the Instagram Posts/insta_posts.json file, then the snapshot in data.js.
   Whatever the source, posts are sorted newest first so the grid always leads with the latest. */
(function () {
  var box = document.getElementById("mk-feed");
  if (!box) return;
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function getJson(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 8000) : null;
    return fetch(url, { credentials: "omit", signal: ctl ? ctl.signal : undefined }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }
  /* The snapshot keeps site-relative paths (assets/instagram/...); this page lives one folder down. */
  function abs(u) { return u ? (/^(https?:)?\//.test(u) ? u : "/" + u) : null; }
  function stamp(p) { var t = Date.parse(p.timestamp); return isNaN(t) ? 0 : t; }
  function map(rows) {
    return (Array.isArray(rows) ? rows : []).map(function (p) {
      return { caption: p.caption || "", timestamp: p.timestamp, permalink: p.permalink || "https://www.instagram.com/purdueusb/",
        eventTitle: p.eventTitle, image: abs(p.imageUrl || p.image), w: p.width || p.w, h: p.height || p.h };
    }).filter(function (p) { return p.image; }).sort(function (a, b) { return stamp(b) - stamp(a); }).slice(0, 6);
  }
  function ago(ts) {
    var h = Math.floor((Date.now() - new Date(ts)) / 36e5);
    if (!(h >= 0)) return "";
    return h < 24 ? h + " hours ago" : Math.floor(h / 24) + " days ago";
  }
  /* A short headline: the event title when there is one, else the caption's first line. */
  function headline(p) {
    var t = p.eventTitle || String(p.caption).split("\n")[0].trim();
    return t.length > 90 ? t.slice(0, 87).replace(/\s+\S*$/, "") + "\u2026" : t;
  }
  function render(posts) {
    box.textContent = "";
    posts.forEach(function (p) {
      var a = el("a", "", "igtile");
      a.href = p.permalink; a.target = "_blank"; a.rel = "noopener noreferrer";
      var im = el("img");
      im.src = p.image; im.alt = "";
      im.width = p.w || 864; im.height = p.h || 1080; im.loading = "lazy";
      var cap = el("span", "", "igtile-cap");
      cap.appendChild(el("strong", headline(p)));
      var when = ago(p.timestamp);
      if (when) cap.appendChild(el("time", when));
      var sr = el("span", " (opens Instagram in a new tab)", "sr-only");
      a.appendChild(im); a.appendChild(cap); a.appendChild(sr);
      box.appendChild(a);
    });
  }

  var snap = map(window.USB_DATA && window.USB_DATA.posts);
  if (snap.length) render(snap);
  if (!/^https?:$/.test(location.protocol)) return;
  getJson("/api/instagram/posts").then(function (d) {
    var posts = map(d && d.posts);
    if (!posts.length) throw new Error("API returned no posts");
    return posts;
  }).catch(function () {
    return getJson("/Instagram Posts/insta_posts.json").then(function (d) {
      var posts = map(d);
      if (!posts.length) throw new Error("no fallback posts");
      return posts;
    });
  }).then(render).catch(function () {
    if (!snap.length) {
      box.textContent = "";
      box.appendChild(el("p", "Posts could not be loaded right now. Find us on Instagram at @purdueusb.", "mk-empty"));
    }
  });
})();
