(function () {
  var frame = document.getElementById('pinballFrame');
  var focusBtn = document.getElementById('pinballFocus');
  var fullBtn = document.getElementById('pinballFull');

  function focusTable() {
    if (frame) frame.focus();
  }

  if (focusBtn) focusBtn.addEventListener('click', focusTable);
  if (frame) frame.addEventListener('load', focusTable);

  if (fullBtn && frame) {
    fullBtn.addEventListener('click', function () {
      var target = frame;
      if (target.requestFullscreen) target.requestFullscreen();
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
    });
  }
})();
