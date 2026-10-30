// Applies the cached theme before React mounts so pages never flash the wrong theme.
// Kept as a separate file because MV3 extension pages block inline scripts.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('chatsweep-theme') || 'system';
  } catch (e) {}
  var dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
