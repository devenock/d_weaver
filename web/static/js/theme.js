(function() {
  var key = 'theme';
  function getPreferred() {
    try {
      return localStorage.getItem(key);
    } catch (_) { return null; }
  }
  function setPreferred(v) {
    try { localStorage.setItem(key, v); } catch (_) {}
  }
  function apply(v) {
    var root = document.documentElement;
    if (v === 'dark') root.classList.add('dark');
    else if (v === 'light') root.classList.remove('dark');
    else {
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (dark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }
  function cycle() {
    var cur = getPreferred();
    var next = cur === 'dark' ? 'light' : (cur === 'light' ? 'system' : 'dark');
    setPreferred(next);
    apply(next);
    updateButtons();
  }
  function updateButtons() {
    var cur = getPreferred() || 'system';
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
      btn.textContent = cur === 'dark' ? '☀ Light' : (cur === 'light' ? '🌙 Dark' : '🌓 ' + (document.documentElement.classList.contains('dark') ? 'Light' : 'Dark'));
    });
  }
  apply(getPreferred() || 'system');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateButtons);
  else updateButtons();
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('theme-toggle') || e.target.closest('.theme-toggle')) cycle();
  });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getPreferred() === 'system' || !getPreferred()) apply('system');
  });
})();
