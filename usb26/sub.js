/* Shared script for the initiative pages: screen-texture switch, remembered across the whole site. */
(function () {
  "use strict";
  var root = document.documentElement;
  var eff = document.getElementById("effect");
  function crtSet(on, save) {
    root.classList.toggle("crt-on", on);
    if (eff) {
      eff.textContent = "Old-screen effect: " + (on ? "on" : "off");
      eff.setAttribute("aria-pressed", String(on));
    }
    if (save) { try { localStorage.setItem("usb-crt", on ? "on" : "off"); } catch (e) { /* ignore */ } }
  }
  var pref = null;
  try { pref = localStorage.getItem("usb-crt"); } catch (e) { /* ignore */ }
  crtSet(pref !== "off", false);
  if (eff) eff.addEventListener("click", function () { crtSet(!root.classList.contains("crt-on"), true); });
})();
