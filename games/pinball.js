(function () {
  var stage = document.getElementById('pinballStage');
  var canvas = document.getElementById('canvas');
  var fullBtn = document.getElementById('pinballFull');
  var loading = document.getElementById('pinballLoading');
  var HOST = 'https://pinball.alula.me/';

  function fit() {
    if (!canvas || !stage) return;
    var w = canvas.width || 600;
    var h = canvas.height || 440;
    if (w < 2 || h < 2) return;
    var pad = 8;
    var availW = Math.max(stage.clientWidth - pad, 1);
    var availH = Math.max(stage.clientHeight - pad, 1);
    var scale = Math.min(availW / w, availH / h);
    canvas.style.setProperty('width', w + 'px', 'important');
    canvas.style.setProperty('height', h + 'px', 'important');
    canvas.style.transformOrigin = 'center center';
    canvas.style.transform = 'scale(' + scale + ')';
  }

  function hideLoading() {
    if (loading) loading.classList.add('is-hidden');
  }

  window.Module = {
    locateFile: function (path) {
      return HOST + String(path).replace(/^\.\//, '');
    },
    canvas: canvas,
    print: function () {},
    printErr: function (message) {
      console.error(message);
    },
    setStatus: function (text) {
      if (!text) hideLoading();
      else if (loading && !/downloading|preparing/i.test(text)) hideLoading();
      fit();
    },
    monitorRunDependencies: function (left) {
      if (left === 0) hideLoading();
    },
    onRuntimeInitialized: function () {
      hideLoading();
      canvas.focus();
      fit();
    }
  };

  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault();
    if (loading) {
      loading.classList.remove('is-hidden');
      loading.textContent = 'Table lost the picture. Reload the page.';
    }
  }, false);

  canvas.addEventListener('pointerdown', function () {
    canvas.focus();
  });

  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', function () {
    if (fullBtn) fullBtn.textContent = document.fullscreenElement ? 'Exit' : 'Full screen';
    fit();
  });

  if (fullBtn && stage) {
    fullBtn.addEventListener('click', function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      var request = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (request) request.call(stage);
    });
  }

  var script = document.createElement('script');
  script.src = HOST + 'SpaceCadetPinball.js';
  script.async = true;
  script.onload = function () {
    var tries = 0;
    var timer = setInterval(function () {
      fit();
      tries += 1;
      if (canvas.width > 2) hideLoading();
      if (tries > 40) clearInterval(timer);
    }, 250);
  };
  document.body.appendChild(script);

  fit();
})();
