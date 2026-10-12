/**
 * ABBEYO MAZE — original grid chase from The Abb Lab.
 * Clear every node. Charges scramble the drones.
 */
(function () {
  'use strict';

  var TILE = 24;
  var COLS = 21;
  var ROWS = 23;
  var TUNNEL = 14;
  var FIELD_W = COLS * TILE;
  var FIELD_H = ROWS * TILE;

  var TEMPLATE = [
    '#####################',
    '#.........#.........#',
    '#.##.####.#.####.##.#',
    '#*#.....#...#.....#*#',
    '####.##.#.#.#.##.####',
    '#......#.....#......#',
    '#.####.#.#.#.#.####.#',
    '#.#....#.#.#.#....#.#',
    '#.#.##.#.#.#.#.##.#.#',
    '#.#.#..#.....#..#.#.#',
    '#...#..###.###..#...#',
    '#.###...........###.#',
    '#.....####.####.....#',
    '##.##.#.......#.##.##',
    '.....................',
    '###.##.#..G..#.##.###',
    '#......#VVVVV#......#',
    '#......#######......#',
    '#.#...............#.#',
    '#.#.####.#.#.####.#.#',
    '#*......#.S.#......*#',
    '#.##.##.#.#.#.##.##.#',
    '#####################'
  ];

  var DIRS = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 }
  };
  var OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
  var ORDER = ['left', 'right', 'up', 'down'];

  var DRONE_KINDS = [
    { name: 'Keel', color: '#2dd4bf', kind: 'chase' },
    { name: 'Vela', color: '#9a82c7', kind: 'mirror' },
    { name: 'Orbit', color: '#d4a574', kind: 'orbit' },
    { name: 'Nix', color: '#7eb6ff', kind: 'drift' }
  ];

  var BEST_KEY = 'abbeyo-maze-best';

  var canvas;
  var ctx;
  var els = {};
  var audioCtx = null;
  var animId = null;
  var lastTs = 0;
  var acc = 0;
  var clock = 0;
  var grid = [];
  var player;
  var drones = [];
  var gate;
  var homes = [];
  var charges = [];
  var state = 'ready';
  var score = 0;
  var best = 0;
  var lives = 3;
  var level = 1;
  var pelletsLeft = 0;
  var chain = 0;
  var mercyUntil = 0;
  var deathUntil = 0;
  var clearUntil = 0;
  var orbitIndex = 0;
  var orbitFlip = 0;
  var lastPelletSound = 0;

  function init() {
    canvas = document.getElementById('mazeCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    els.status = document.getElementById('gameStatus');
    els.statusLabel = document.getElementById('statusLabel');
    els.score = document.getElementById('scoreValue');
    els.best = document.getElementById('bestValue');
    els.level = document.getElementById('levelValue');
    els.lives = document.getElementById('livesValue');
    els.overlay = document.getElementById('gameOverlay');
    els.overlayTitle = document.getElementById('overlayTitle');
    els.overlayMsg = document.getElementById('overlayMsg');

    best = readBest();
    bindInput();
    newRun();
    draw();
    animId = requestAnimationFrame(frame);
  }

  function bindInput() {
    document.addEventListener('keydown', onKeyDown);
    var buttons = document.querySelectorAll('[data-maze]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', onButton);
    }
    var pad = document.querySelectorAll('[data-dir]');
    for (var j = 0; j < pad.length; j++) {
      pad[j].addEventListener('pointerdown', onPad);
    }
    canvas.addEventListener('pointerdown', unlockAudio);
    if (canvas) {
      var touch = { x: 0, y: 0 };
      canvas.addEventListener('pointerdown', function (e) {
        touch.x = e.clientX;
        touch.y = e.clientY;
      });
      canvas.addEventListener('pointerup', function (e) {
        var dx = e.clientX - touch.x;
        var dy = e.clientY - touch.y;
        if (Math.hypot(dx, dy) < 18) return;
        if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 'right' : 'left');
        else queueDir(dy > 0 ? 'down' : 'up');
      });
    }
  }

  function onButton(e) {
    unlockAudio();
    var action = e.currentTarget.getAttribute('data-maze');
    if (action === 'start') beginOrResume();
    else if (action === 'pause') togglePause();
    else if (action === 'reset') newRun();
  }

  function onPad(e) {
    e.preventDefault();
    unlockAudio();
    queueDir(e.currentTarget.getAttribute('data-dir'));
  }

  function onKeyDown(e) {
    var dir = keyDir(e.key);
    if (dir) {
      e.preventDefault();
      unlockAudio();
      queueDir(dir);
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      unlockAudio();
      beginOrResume();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePause();
    } else if (e.key === 'r' || e.key === 'R') {
      newRun();
    }
  }

  function keyDir(key) {
    var map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      A: 'left', D: 'right', W: 'up', S: 'down'
    };
    return map[key] || null;
  }

  function queueDir(dir) {
    if (!dir) return;
    if (state === 'ready' || state === 'over') beginOrResume();
    if (state === 'pause') return;
    if (player) player.next = dir;
  }

  function beginOrResume() {
    if (state === 'ready' || state === 'over' || state === 'clear') {
      if (state === 'over' || state === 'clear') newRun();
      scheduleRelease();
      state = 'play';
      mercyUntil = clock + 1.5;
      tone(523, 0.08, 'square', 0.04);
      tone(784, 0.1, 'square', 0.03);
      updateUI();
      return;
    }
    if (state === 'pause') {
      state = 'play';
      updateUI();
    }
  }

  function togglePause() {
    if (state === 'play') state = 'pause';
    else if (state === 'pause') state = 'play';
    updateUI();
  }

  function newRun() {
    score = 0;
    lives = 3;
    level = 1;
    chain = 0;
    loadLevel(false);
    state = 'ready';
    updateUI();
  }

  function loadLevel(advance) {
    if (advance) level += 1;
    grid = TEMPLATE.map(function (row) { return row.split(''); });
    pelletsLeft = 0;
    homes = [];
    charges = [];
    gate = null;
    var start = null;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var ch = grid[y][x];
        if (ch === '.' || ch === '*') pelletsLeft += 1;
        if (ch === '*') charges.push({ x: x, y: y });
        if (ch === 'V') homes.push({ x: x, y: y });
        if (ch === 'G') gate = { x: x, y: y };
        if (ch === 'S') start = { x: x, y: y };
      }
    }
    homes = homes.slice(0, 4);
    player = makeActor(start.x, start.y, 'player');
    drones = homes.map(function (home, i) {
      var spec = DRONE_KINDS[i];
      var drone = makeActor(home.x, home.y, 'drone');
      drone.name = spec.name;
      drone.color = spec.color;
      drone.kind = spec.kind;
      drone.home = home;
      drone.mode = 'home';
      drone.releaseAt = clock + 0.6 + i * releaseGap();
      return drone;
    });
    orbitIndex = 0;
    orbitFlip = clock + 6;
    mercyUntil = clock + 1.5;
    scheduleRelease();
  }

  function scheduleRelease() {
    for (var i = 0; i < drones.length; i++) {
      if (drones[i].mode === 'home') {
        drones[i].releaseAt = clock + 0.7 + i * releaseGap();
      }
    }
  }

  function makeActor(col, row, team) {
    return {
      team: team,
      x: col * TILE + TILE / 2,
      y: row * TILE + TILE / 2,
      dir: null,
      next: null,
      mode: 'roam',
      speed: 0
    };
  }

  function releaseGap() {
    return Math.max(1.15, 2.3 - (level - 1) * 0.12);
  }

  function speedFor(actor) {
    var mult = Math.min(1.5, 1 + (level - 1) * 0.07);
    if (actor.team === 'player') return 96 * mult;
    if (actor.mode === 'scared') return 58;
    if (actor.mode === 'return') return 150;
    if (actor.mode === 'leave') return 80;
    return 76 * mult;
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    acc += dt;
    while (acc >= 1 / 60) {
      tick(1 / 60);
      acc -= 1 / 60;
    }
    draw();
    animId = requestAnimationFrame(frame);
  }

  function tick(dt) {
    clock += dt;
    if (state === 'dying') {
      if (clock >= deathUntil) finishDeath();
      return;
    }
    if (state === 'clear') {
      if (clock >= clearUntil) {
        loadLevel(true);
        state = 'play';
        updateUI();
      }
      return;
    }
    if (state !== 'play') return;
    player.speed = speedFor(player);
    moveActor(player, dt);
    eatNodes();
    for (var i = 0; i < drones.length; i++) stepDrone(drones[i], dt);
    handleHits();
    if (pelletsLeft <= 0 && state === 'play') {
      score += 1000;
      state = 'clear';
      clearUntil = clock + 1.3;
      tone(523, 0.1, 'square', 0.05);
      tone(659, 0.12, 'square', 0.04);
      tone(784, 0.16, 'square', 0.04);
      updateUI();
    }
  }

  function stepDrone(drone, dt) {
    if (drone.mode === 'home' && clock >= drone.releaseAt) {
      drone.mode = 'leave';
      drone.dir = 'up';
    }
    if (drone.mode === 'scared' && clock >= drone.scaredUntil) drone.mode = 'roam';
    if (drone.mode === 'home') return;
    drone.speed = speedFor(drone);
    moveActor(drone, dt);
    var col = colOf(drone.x);
    var row = rowOf(drone.y);
    if (drone.mode === 'leave' && gate && row === gate.y - 1 && col === gate.x) {
      drone.mode = 'roam';
    }
    if (drone.mode === 'return' && row === drone.home.y && col === drone.home.x) {
      drone.mode = 'home';
      drone.dir = null;
      drone.releaseAt = clock + 1.8;
    }
  }

  function moveActor(actor, dt) {
    if (actor.team === 'player' && actor.next && actor.dir && actor.next === OPP[actor.dir]) {
      actor.dir = actor.next;
      actor.next = null;
    }
    if (actor.team === 'player' && !actor.dir && actor.next) {
      var col0 = colOf(actor.x);
      var row0 = rowOf(actor.y);
      if (tryDir(col0, row0, actor.next, 'player')) {
        actor.dir = actor.next;
        actor.next = null;
      }
    }
    if (!actor.dir) return;

    var step = actor.speed * dt;
    var target = nextCenterAhead(actor);
    if (!target) return;
    var aimCol = Math.floor(target.x / TILE);
    var aimRow = Math.floor(target.y / TILE);
    if (!passable(cellAt(aimCol, aimRow), accessOf(actor))) {
      actor.dir = null;
      return;
    }
    var dist = Math.hypot(target.x - actor.x, target.y - actor.y);
    if (step < dist - 0.001) {
      var d = DIRS[actor.dir];
      actor.x += d.x * step;
      actor.y += d.y * step;
      wrap(actor);
      return;
    }

    actor.x = target.x;
    actor.y = target.y;
    wrap(actor);
    var col = colOf(actor.x);
    var row = rowOf(actor.y);
    var chosen = null;
    if (actor.team === 'player') {
      if (actor.next && tryDir(col, row, actor.next, 'player')) chosen = actor.next;
      else if (tryDir(col, row, actor.dir, 'player')) chosen = actor.dir;
      if (chosen && chosen === actor.next) actor.next = null;
    } else {
      chosen = droneDir(actor, col, row);
    }
    actor.dir = chosen;
    var remain = step - dist;
    if (actor.dir && remain > 0.001) {
      var nd = DIRS[actor.dir];
      actor.x += nd.x * remain;
      actor.y += nd.y * remain;
      wrap(actor);
    }
  }

  function nextCenterAhead(actor) {
    var d = DIRS[actor.dir];
    if (!d) return null;
    if (d.x !== 0) {
      var base = Math.floor(actor.x / TILE) * TILE + TILE / 2;
      var x = d.x > 0
        ? (actor.x < base ? base : base + TILE)
        : (actor.x > base ? base : base - TILE);
      return { x: x, y: actor.y };
    }
    var baseY = Math.floor(actor.y / TILE) * TILE + TILE / 2;
    var y = d.y > 0
      ? (actor.y < baseY ? baseY : baseY + TILE)
      : (actor.y > baseY ? baseY : baseY - TILE);
    return { x: actor.x, y: y };
  }

  function droneDir(actor, col, row) {
    var access = accessOf(actor);
    var back = actor.dir ? OPP[actor.dir] : null;
    var options = [];
    for (var i = 0; i < ORDER.length; i++) {
      if (tryDir(col, row, ORDER[i], access)) options.push(ORDER[i]);
    }
    if (!options.length) return null;
    var forward = options.filter(function (dir) { return dir !== back; });
    var pool = forward.length ? forward : options;

    if (actor.mode === 'leave' && gate) return stepToward(pool, col, row, gate.x, gate.y - 1, actor.dir);
    if (actor.mode === 'return') return stepToward(pool, col, row, actor.home.x, actor.home.y, actor.dir);
    if (actor.mode === 'scared') return pool[Math.floor(Math.random() * pool.length)];
    if (actor.kind === 'drift') {
      if (actor.dir && pool.indexOf(actor.dir) !== -1 && Math.random() < 0.72) return actor.dir;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    var target = roamTarget(actor);
    return stepToward(pool, col, row, target.x, target.y, actor.dir);
  }

  function roamTarget(actor) {
    var col = colOf(player.x);
    var row = rowOf(player.y);
    if (actor.kind === 'mirror') return { x: COLS - 1 - col, y: ROWS - 1 - row };
    if (actor.kind === 'orbit') {
      if (clock >= orbitFlip) {
        orbitFlip = clock + 6;
        orbitIndex = (orbitIndex + 1) % Math.max(1, charges.length);
      }
      return charges.length ? charges[orbitIndex % charges.length] : { x: col, y: row };
    }
    return { x: col, y: row };
  }

  function stepToward(pool, col, row, tx, ty, prefer) {
    var best = pool[0];
    var bestScore = Infinity;
    for (var i = 0; i < pool.length; i++) {
      var d = DIRS[pool[i]];
      var nx = col + d.x;
      var ny = row + d.y;
      if (row === TUNNEL) nx = (nx + COLS) % COLS;
      var score = Math.abs(nx - tx) + Math.abs(ny - ty);
      if (score < bestScore || (score === bestScore && pool[i] === prefer)) {
        bestScore = score;
        best = pool[i];
      }
    }
    return best;
  }

  function tryDir(col, row, dir, access) {
    var d = DIRS[dir];
    if (!d) return false;
    return passable(cellAt(col + d.x, row + d.y), access);
  }

  function cellAt(col, row) {
    if (row === TUNNEL) col = ((col % COLS) + COLS) % COLS;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
    return grid[row][col];
  }

  function passable(ch, access) {
    if (ch === '#') return false;
    if ((ch === 'V' || ch === 'G') && access === 'player') return false;
    return true;
  }

  function accessOf(actor) {
    if (actor.team === 'player') return 'player';
    if (actor.mode === 'leave' || actor.mode === 'return' || actor.mode === 'home') return 'drone';
    return 'player';
  }

  function eatNodes() {
    var col = colOf(player.x);
    var row = rowOf(player.y);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    var ch = grid[row][col];
    if (ch !== '.' && ch !== '*') return;
    grid[row][col] = ' ';
    pelletsLeft -= 1;
    if (ch === '.') {
      score += 10;
      if (clock - lastPelletSound > 0.045) {
        lastPelletSound = clock;
        tone(720 + (col % 5) * 30, 0.03, 'square', 0.02);
      }
    } else {
      score += 50;
      frighten();
      tone(220, 0.1, 'sawtooth', 0.04);
      tone(440, 0.14, 'square', 0.04);
    }
    updateUI();
  }

  function frighten() {
    chain = 0;
    for (var i = 0; i < drones.length; i++) {
      var drone = drones[i];
      if (drone.mode === 'roam' || drone.mode === 'leave') {
        drone.mode = 'scared';
        drone.scaredUntil = clock + Math.max(4.2, 6.8 - (level - 1) * 0.3);
        if (drone.dir) drone.dir = OPP[drone.dir];
      }
    }
  }

  function handleHits() {
    for (var i = 0; i < drones.length; i++) {
      var drone = drones[i];
      if (drone.mode === 'home' || drone.mode === 'return') continue;
      if (Math.hypot(player.x - drone.x, player.y - drone.y) > TILE * 0.7) continue;
      if (drone.mode === 'scared') {
        var gain = [200, 400, 800, 1600][Math.min(3, chain)];
        chain += 1;
        score += gain;
        drone.mode = 'return';
        tone(880, 0.07, 'square', 0.05);
        updateUI();
      } else if (clock >= mercyUntil && state === 'play') {
        state = 'dying';
        deathUntil = clock + 0.85;
        tone(140, 0.22, 'sawtooth', 0.05);
        updateUI();
        return;
      }
    }
  }

  function finishDeath() {
    lives -= 1;
    if (lives <= 0) {
      state = 'over';
      saveBest();
      updateUI();
      return;
    }
    var kept = grid.map(function (row) { return row.slice(); });
    var left = pelletsLeft;
    var keptScore = score;
    var keptLives = lives;
    var keptLevel = level;
    loadLevel(false);
    grid = kept;
    pelletsLeft = left;
    score = keptScore;
    lives = keptLives;
    level = keptLevel;
    state = 'play';
    mercyUntil = clock + 1.6;
    updateUI();
  }

  function colOf(x) {
    var width = COLS * TILE;
    var wrapped = ((x % width) + width) % width;
    return Math.floor(wrapped / TILE);
  }

  function rowOf(y) {
    return Math.floor(y / TILE);
  }

  function wrap(actor) {
    if (rowOf(actor.y) !== TUNNEL) return;
    var width = COLS * TILE;
    if (actor.x < 0) actor.x += width;
    else if (actor.x >= width) actor.x -= width;
  }

  function draw() {
    ctx.clearRect(0, 0, FIELD_W, FIELD_H);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) drawCell(x, y, grid[y][x]);
    }
    for (var i = 0; i < drones.length; i++) drawDrone(drones[i]);
    if (player && (state !== 'dying' || Math.floor(clock * 12) % 2 === 0)) drawPlayer();
    updateUI();
  }

  function drawCell(x, y, ch) {
    var px = x * TILE;
    var py = y * TILE;
    if (ch === '#') {
      ctx.fillStyle = '#12383c';
      roundRect(px + 2, py + 2, TILE - 4, TILE - 4, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
      ctx.stroke();
      return;
    }
    if (ch === 'V' || ch === 'G') {
      ctx.fillStyle = '#0c1218';
      ctx.fillRect(px, py, TILE, TILE);
    }
    if (ch === 'G') {
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(px + 3, py + TILE / 2 - 2, TILE - 6, 4);
    }
    if (ch === '.') {
      ctx.fillStyle = '#d7fff8';
      ctx.fillRect(px + TILE / 2 - 2, py + TILE / 2 - 2, 4, 4);
    }
    if (ch === '*') {
      var pulse = 5 + Math.sin(clock * 6) * 1.4;
      ctx.save();
      ctx.translate(px + TILE / 2, py + TILE / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#9a82c7';
      ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      ctx.restore();
    }
  }

  function drawPlayer() {
    var flash = clock < mercyUntil && Math.floor(clock * 10) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = flash ? 0.35 : 1;
    var ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[player.dir || 'right'];
    ctx.rotate(ang);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      var px = Math.cos(a) * 9;
      var py = Math.sin(a) * 9;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#f4fffd';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#007a72';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(3, -3.2);
    ctx.lineTo(3, 3.2);
    ctx.closePath();
    ctx.fillStyle = '#007a72';
    ctx.fill();
    ctx.restore();
  }

  function drawDrone(drone) {
    ctx.save();
    ctx.translate(drone.x, drone.y);
    if (drone.mode === 'return') {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = drone.color;
      ctx.stroke();
      ctx.restore();
      return;
    }
    var scared = drone.mode === 'scared';
    var warn = scared && drone.scaredUntil - clock < 1.8 && Math.floor(clock * 8) % 2 === 0;
    roundRect(-8, -8, 16, 16, 4);
    ctx.fillStyle = warn ? '#f4f0ff' : (scared ? '#6d5bd0' : drone.color);
    ctx.fill();
    ctx.fillStyle = '#0a0b0f';
    ctx.fillRect(-6, -2, 12, 3);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.rect(x, y, w, h);
  }

  function updateUI() {
    if (!els.score) return;
    els.score.textContent = String(score);
    els.best.textContent = String(Math.max(best, score));
    els.level.textContent = String(level);
    els.lives.textContent = String(lives);
    els.status.classList.remove('is-playing', 'is-paused', 'is-over');
    var label = 'Ready';
    var title = 'ABBEYO MAZE';
    var msg = 'Arrows or WASD. Clear every node.';
    var show = state !== 'play';
    if (state === 'play') {
      label = drones.some(function (d) { return d.mode === 'scared'; }) ? 'Scrambled' : 'Running';
      els.status.classList.add('is-playing');
    } else if (state === 'pause') {
      label = 'Paused';
      title = 'Paused';
      msg = 'Press P or Pause to continue.';
      els.status.classList.add('is-paused');
    } else if (state === 'dying') {
      label = 'Hit';
      show = false;
    } else if (state === 'clear') {
      label = 'Sector clear';
      title = 'Sector clear';
      msg = 'Next sector is faster.';
      els.status.classList.add('is-playing');
    } else if (state === 'over') {
      label = 'Run over';
      title = 'Run over';
      msg = 'Score ' + score + '. Press Space or Start for a new run.';
      els.status.classList.add('is-over');
    }
    els.statusLabel.textContent = label;
    els.overlayTitle.textContent = title;
    els.overlayMsg.textContent = msg;
    els.overlay.classList.toggle('is-hidden', !show);
  }

  function readBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
    } catch (err) {
      return 0;
    }
  }

  function saveBest() {
    if (score > best) best = score;
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (err) {
      /* private mode */
    }
  }

  function unlockAudio() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, dur, type, gain) {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var amp = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    amp.gain.value = gain || 0.04;
    amp.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
