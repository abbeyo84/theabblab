/* Clara — /clara/ room. Copy-to-clipboard for the tailnet onboarding steps. */
(function () {
  'use strict';

  function flash(btn, text) {
    var original = btn.textContent;
    btn.textContent = text;
    btn.classList.add('is-done');
    window.setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('is-done');
    }, 1500);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-secure contexts and older browsers.
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('.clara-copy');
    if (!btn) return;
    event.preventDefault();
    var text = btn.getAttribute('data-copy') || '';
    if (!text) return;
    copy(text).then(
      function () { flash(btn, 'Copied'); },
      function () { flash(btn, 'Select + copy'); }
    );
  });
})();
