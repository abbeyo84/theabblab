/**
 * LAB PONG — Classic Arcade Game
 */
(function () {
  'use strict';

  var WIN_SCORE = 11;
  var FIELD_W = 800;
  var FIELD_H = 500;
  var PADDLE_W = 12;
  var PADDLE_H = 80;
  var PADDLE_MARGIN = 24;
  var BALL_SIZE = 10;
  var BASE_BALL_SPEED = 5;
  var MAX_BALL_SPEED = 14;
  var PADDLE_SPEED = 7;
  var AI_SPEED = 5.5;
  var SERVE_DELAY_MS = 2500;

  var els = {};
  var canvas;
  var ctx;
  var keys = {};
  var mode = 'two';
  var state = 'idle';
  var scoreLeft = 0;
  var scoreRight = 0;
  var animId = null;
  var audioCtx = null;
  var serveTimer = null;
  var countdownInterval = null;

  var leftPaddle = { x: PADDLE_MARGIN, y: FIELD_H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
  var rightPaddle = { x: FIELD_W - PADDLE_MARGIN - PADDLE_W, y: FIELD_H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
  var ball = { x: FIELD_W / 2, y: FIELD_H / 2, vx: 0, vy: 0, size: BALL_SIZE };

  function init() {
    canvas = document.getElementById('pongCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resizeCanvas();

    els.status = document.getElementById('gameStatus');
    els.statusLabel = document.getElementById('statusLabel');
    els.scoreLeft = document.getElementById('scoreLeft');
    els.scoreRight = document.getElementById('scoreRight');
    els.leftLabel = document.getElementById('leftLabel');
    els.rightLabel = document.getElementById('rightLabel');
    els.overlay = document.getElementById('gameOverlay');
    els.overlayTitle = document.getElementById('overlayTitle');
    els.overlayMsg = document.getElementById('overlayMsg');
    els.modeTwo = document.getElementById('modeTwoPlayer');
    els.modeOne = document.getElementById('modeOnePlayer');
    els.btnStart = document.getElementById('btnStart');
    els.btnPause = document.getElementById('btnPause');
    els.btnReset = document.getElementById('btnReset');
    els.rightControlsCard = document.getElementById('rightControlsCard');
    els.rightControlsLabel = document.getElementById('rightControlsLabel');
    els.rightControlsList = document.getElementById('rightControlsList');

    els.modeTwo.addEventListener('click', function () { setMode('two'); });
    els.modeOne.addEventListener('click', function () { setMode('one'); });
    els.btnStart.addEventListener('click', handleStart);
    els.btnPause.addEventListener('click', togglePause);
    els.btnReset.addEventListener('click', resetGame);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resizeCanvas);

    resetPaddles();
    resetBall(true);
    updateLabels();
    updateUI();
    draw();
  }

  function resizeCanvas() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.floor(rect.width * dpr);
    var h = Math.floor((rect.width / FIELD_W) * FIELD_H * dpr);
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(w / FIELD_W, 0, 0, h / FIELD_H, 0, 0);
  }

  function setMode(newMode) {
    if (state === 'playing') return;
    mode = newMode;
    els.modeTwo.classList.toggle('is-active', mode === 'two');
    els.modeOne.classList.toggle('is-active', mode === 'one');
    els.modeTwo.setAttribute('aria-pressed', String(mode === 'two'));
    els.modeOne.setAttribute('aria-pressed', String(mode === 'one'));
    updateLabels();
    resetGame();
  }

  function updateLabels() {
    els.leftLabel.textContent = 'Player 1';
    if (mode === 'one') {
      els.rightLabel.textContent = 'Lab AI';
      els.rightControlsLabel.textContent = 'Lab AI';
      els.rightControlsList.innerHTML = '<li>Controlled by the lab</li><li>Reacts to ball trajectory</li>';
    } else {
      els.rightLabel.textContent = 'Player 2';
      els.rightControlsLabel.textContent = 'Right Paddle';
      els.rightControlsList.innerHTML = '<li><kbd>↑</kbd> Move up</li><li><kbd>↓</kbd> Move down</li>';
    }
  }

  function resetPaddles() {
    leftPaddle.y = FIELD_H / 2 - PADDLE_H / 2;
    rightPaddle.y = FIELD_H / 2 - PADDLE_H / 2;
  }

  function resetBall(centered) {
    ball.x = FIELD_W / 2;
    ball.y = FIELD_H / 2;
    ball.vx = 0;
    ball.vy = 0;
    if (!centered) {
      var dir = Math.random() > 0.5 ? 1 : -1;
      var angle = (Math.random() * 0.6 - 0.3);
      ball.vx = dir * BASE_BALL_SPEED;
      ball.vy = BASE_BALL_SPEED * angle;
    }
  }

  function serveBall() {
    var dir = Math.random() > 0.5 ? 1 : -1;
    var angle = (Math.random() * 0.8 - 0.4);
    var speed = BASE_BALL_SPEED;
    ball.vx = dir * speed;
    ball.vy = speed * angle;
    playBeep(440, 0.05, 0.08);
  }

  function clearServeTimer() {
    if (serveTimer) {
      clearTimeout(serveTimer);
      serveTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function scheduleAutoServe() {
    clearServeTimer();
    var secondsLeft = Math.ceil(SERVE_DELAY_MS / 1000);
    els.overlayMsg.textContent = 'Next serve in ' + secondsLeft + '…';

    countdownInterval = setInterval(function () {
      secondsLeft--;
      if (secondsLeft > 0) {
        els.overlayMsg.textContent = 'Next serve in ' + secondsLeft + '…';
      }
    }, 1000);

    serveTimer = setTimeout(function () {
      clearServeTimer();
      if (state === 'serving') {
        state = 'playing';
        serveBall();
        updateUI();
        startLoop();
      }
    }, SERVE_DELAY_MS);
  }

  function resetGame() {
    clearServeTimer();
    stopLoop();
    scoreLeft = 0;
    scoreRight = 0;
    state = 'idle';
    resetPaddles();
    resetBall(true);
    updateScores();
    updateUI();
    draw();
  }

  function handleStart() {
    if (state === 'over') {
      resetGame();
    }
    if (state === 'idle' || state === 'serving') {
      clearServeTimer();
      state = 'playing';
      serveBall();
      updateUI();
      startLoop();
    } else if (state === 'paused') {
      state = 'playing';
      updateUI();
      startLoop();
    }
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      stopLoop();
      updateUI();
      draw();
    } else if (state === 'paused') {
      state = 'playing';
      updateUI();
      startLoop();
    }
  }

  function onKeyDown(e) {
    keys[e.code] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      handleStart();
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      togglePause();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      resetGame();
    }

    if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].indexOf(e.code) !== -1) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function startLoop() {
    if (animId) return;
    function loop() {
      if (state === 'playing') {
        update();
        draw();
        animId = requestAnimationFrame(loop);
      }
    }
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function update() {
    movePaddle(leftPaddle, keys['KeyW'], keys['KeyS']);

    if (mode === 'two') {
      movePaddle(rightPaddle, keys['ArrowUp'], keys['ArrowDown']);
    } else {
      updateAI();
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.size / 2 <= 0) {
      ball.y = ball.size / 2;
      ball.vy = Math.abs(ball.vy);
      playBeep(300, 0.04, 0.06);
    } else if (ball.y + ball.size / 2 >= FIELD_H) {
      ball.y = FIELD_H - ball.size / 2;
      ball.vy = -Math.abs(ball.vy);
      playBeep(300, 0.04, 0.06);
    }

    checkPaddleCollision(leftPaddle, 1);
    checkPaddleCollision(rightPaddle, -1);

    if (ball.x < -ball.size) {
      scoreRight++;
      playBeep(200, 0.1, 0.12);
      afterPoint();
    } else if (ball.x > FIELD_W + ball.size) {
      scoreLeft++;
      playBeep(200, 0.1, 0.12);
      afterPoint();
    }
  }

  function movePaddle(paddle, upKey, downKey) {
    if (upKey) paddle.y -= PADDLE_SPEED;
    if (downKey) paddle.y += PADDLE_SPEED;
    paddle.y = Math.max(0, Math.min(FIELD_H - paddle.h, paddle.y));
  }

  function updateAI() {
    if (ball.vx <= 0) {
      var center = FIELD_H / 2 - PADDLE_H / 2;
      if (rightPaddle.y < center - 2) rightPaddle.y += AI_SPEED * 0.4;
      else if (rightPaddle.y > center + 2) rightPaddle.y -= AI_SPEED * 0.4;
      return;
    }

    var target = ball.y - PADDLE_H / 2;
    var error = (Math.random() - 0.5) * 18;
    target += error;

    if (rightPaddle.y + PADDLE_H / 2 < target + PADDLE_H / 2 - 10) {
      rightPaddle.y += AI_SPEED;
    } else if (rightPaddle.y + PADDLE_H / 2 > target + PADDLE_H / 2 + 10) {
      rightPaddle.y -= AI_SPEED;
    }

    rightPaddle.y = Math.max(0, Math.min(FIELD_H - rightPaddle.h, rightPaddle.y));
  }

  function checkPaddleCollision(paddle, direction) {
    var ballLeft = ball.x - ball.size / 2;
    var ballRight = ball.x + ball.size / 2;
    var ballTop = ball.y - ball.size / 2;
    var ballBottom = ball.y + ball.size / 2;

    var padLeft = paddle.x;
    var padRight = paddle.x + paddle.w;
    var padTop = paddle.y;
    var padBottom = paddle.y + paddle.h;

    if (ballRight < padLeft || ballLeft > padRight) return;
    if (ballBottom < padTop || ballTop > padBottom) return;

    if (direction === 1 && ball.vx < 0) {
      ball.x = padRight + ball.size / 2;
      deflectOffPaddle(paddle);
    } else if (direction === -1 && ball.vx > 0) {
      ball.x = padLeft - ball.size / 2;
      deflectOffPaddle(paddle);
    }
  }

  function deflectOffPaddle(paddle) {
    var hitPos = (ball.y - paddle.y) / paddle.h;
    hitPos = Math.max(0, Math.min(1, hitPos));
    var angle = (hitPos - 0.5) * 1.2;

    var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    speed = Math.min(speed * 1.05 + 0.2, MAX_BALL_SPEED);
    speed = Math.max(speed, BASE_BALL_SPEED);

    var dir = ball.vx > 0 ? -1 : 1;
    ball.vx = dir * speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);

    playBeep(520, 0.04, 0.1);
  }

  function afterPoint() {
    updateScores();

    if (scoreLeft >= WIN_SCORE || scoreRight >= WIN_SCORE) {
      state = 'over';
      stopLoop();
      var winner = scoreLeft >= WIN_SCORE ? els.leftLabel.textContent : els.rightLabel.textContent;
      els.overlayTitle.textContent = winner + ' Wins!';
      els.overlayMsg.textContent = 'Press Reset or R to play again';
      updateUI();
      draw();
      return;
    }

    state = 'serving';
    resetPaddles();
    resetBall(true);
    stopLoop();
    els.overlayTitle.textContent = 'Point Scored';
    updateUI();
    draw();
    scheduleAutoServe();
  }

  function updateScores() {
    els.scoreLeft.textContent = String(scoreLeft);
    els.scoreRight.textContent = String(scoreRight);
  }

  function updateUI() {
    els.status.classList.remove('is-playing', 'is-paused', 'is-over');

    if (state === 'playing') {
      els.status.classList.add('is-playing');
      els.statusLabel.textContent = 'Playing';
      els.overlay.classList.add('is-hidden');
    } else if (state === 'paused') {
      els.status.classList.add('is-paused');
      els.statusLabel.textContent = 'Paused';
      els.overlay.classList.remove('is-hidden');
      els.overlayTitle.textContent = 'Paused';
      els.overlayMsg.textContent = 'Press P or Pause to resume';
    } else if (state === 'over') {
      els.status.classList.add('is-over');
      els.statusLabel.textContent = 'Game Over';
      els.overlay.classList.remove('is-hidden');
    } else if (state === 'serving') {
      els.statusLabel.textContent = 'Serving';
      els.overlay.classList.remove('is-hidden');
    } else {
      els.statusLabel.textContent = 'Ready';
      els.overlay.classList.remove('is-hidden');
      if (state === 'idle') {
        els.overlayTitle.textContent = 'LAB PONG';
        els.overlayMsg.textContent = 'Press Space or click Start to serve';
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    ctx.setLineDash([12, 12]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(FIELD_W / 2, 0);
    ctx.lineTo(FIELD_W / 2, FIELD_H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fff';
    ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);

    ctx.fillRect(
      ball.x - ball.size / 2,
      ball.y - ball.size / 2,
      ball.size,
      ball.size
    );
  }

  function playBeep(freq, duration, volume) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();

      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = volume || 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      /* audio optional */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();