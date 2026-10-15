// The activation page: the site's remembered theme (light / dark), applied before the first paint.
// It is the only thing this page reads from the browser's storage. The licence state never is.
(function () {
  try {
    var theme = window.localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { /* storage blocked: the system theme */ }
})();
