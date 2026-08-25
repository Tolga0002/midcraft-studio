// MidCraft Studio — Verdrahtung: 3D-Szene, Maus-Bauen, Blockly, Chat, Buttons.
'use strict';

function main() {
  // ── Dezente Klick-Sounds (WebAudio, erst nach erster Nutzergeste) ──
  const sounds = (() => {
    let ctx = null;
    const ensure = () => {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      return ctx;
    };
    const blip = (freq, dur = 0.07, type = 'square', gainV = 0.04) => {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gainV, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    };
    return {
      place: () => blip(520, 0.06),
      destroy: () => blip(200, 0.08, 'sawtooth'),
      move: () => {},
      bump: () => blip(110, 0.09, 'sawtooth', 0.03),
      success: () => { blip(523, 0.1, 'sine', 0.06); setTimeout(() => blip(659, 0.1, 'sine', 0.06), 110); setTimeout(() => blip(784, 0.18, 'sine', 0.06), 220); },
    };
  })();

  // ── Three.js-Grundgerüst ──
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd8f5);
  scene.fog = new THREE.Fog(0x9fd8f5, 55, 110);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 17, 26);

  const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x5a7d4a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d6, 0.9);
  sun.position.set(24, 40, 14);
  scene.add(sun);

  // Gitternetz auf der Grasoberfläche
  const grid = new THREE.GridHelper(WORLD.W, WORLD.W, 0x2f6b28, 0x2f6b28);
  grid.position.y = 1.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  scene.add(grid);

  // ── Welt + Agent ──
  const world = new VoxelWorld(scene);
  const agent = new Agent(scene, world);

  // Start-Fahne neben dem Spawnpunkt
  (function spawnFlag() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x777777 })
    );
    pole.position.y = 0.55;
    g.add(pole);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.03),
      new THREE.MeshLambertMaterial({ color: 0xff8c1a })
    );
    flag.position.set(0.28, 0.9, 0);
    g.add(flag);
    const base = world.cellToPos(agent.spawn.x - 1, agent.spawn.y, agent.spawn.z);
    g.position.set(base.x, base.y - 0.5, base.z);
    scene.add(g);
  })();

  // ── Kamera-Steuerung ──
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = 4;
  controls.maxDistance = 90;
  controls.target.set(0, 1, 0);

  // ── Toast / Status ──
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg, kind = '') {
    toastEl.textContent = msg;
    toastEl.className = kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3500);
  }

  // ── Hotbar (Tasten 1–8) ──
  // 3D-Würfel-Icon wie im Vorbild: Oberseite hell, Seiten abgedunkelt
  const cubeIcons = new Map();
  function makeCubeIcon(id) {
    if (cubeIcons.has(id)) return cubeIcons.get(id);
    const tex = world.faceTextures.get(id);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const w = 22, h = 24, cx = 32, ct = 15; // Halbbreite, Seitenhöhe, Mitte der oberen Raute
    const N = [cx, ct - w / 2], E = [cx + w, ct], S = [cx, ct + w / 2], W = [cx - w, ct];
    const face = (img, O, U, V, schatten) => {
      g.setTransform(U[0] / 16, U[1] / 16, V[0] / 16, V[1] / 16, O[0], O[1]);
      g.drawImage(img, 0, 0);
      if (schatten) { g.fillStyle = `rgba(0,0,0,${schatten})`; g.fillRect(0, 0, 16, 16); }
      g.setTransform(1, 0, 0, 1, 0, 0);
    };
    const top = tex.top.userData.canvas, side = tex.side.userData.canvas;
    face(top, N, [E[0] - N[0], E[1] - N[1]], [W[0] - N[0], W[1] - N[1]], 0);
    face(side, W, [S[0] - W[0], S[1] - W[1]], [0, h], 0.2);   // linke Fläche
    face(side, S, [E[0] - S[0], E[1] - S[1]], [0, h], 0.42);  // rechte Fläche
    const url = `url(${cv.toDataURL()})`;
    cubeIcons.set(id, url);
    return url;
  }

  let selectedMaterial = 'stein';
  const hotbar = document.getElementById('hotbar');
  MATERIAL_ORDER.forEach((id, i) => {
    const def = MATERIALS[id];
    const el = document.createElement('div');
    el.className = 'slot' + (id === selectedMaterial ? ' selected' : '');
    el.style.backgroundImage = makeCubeIcon(id);
    el.dataset.material = id;
    el.innerHTML = `<span class="slot-num">${i + 1}</span><span class="slot-name">${def.name}</span>`;
    el.addEventListener('click', () => selectMaterial(id));
    hotbar.appendChild(el);
  });
  const handEl = document.getElementById('hand');
  function selectMaterial(id) {
    selectedMaterial = id;
    document.querySelectorAll('.slot').forEach(s => s.classList.toggle('selected', s.dataset.material === id));
    handEl.style.backgroundImage = makeCubeIcon(id);
  }
  selectMaterial(selectedMaterial);
  window.addEventListener('keydown', e => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= MATERIAL_ORDER.length) selectMaterial(MATERIAL_ORDER[n - 1]);
  });

  // ── Wolken ──
  const clouds = [];
  {
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    let cseed = 7;
    const crnd = () => (cseed = (cseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const teile = 2 + (crnd() * 3 | 0);
      for (let t = 0; t < teile; t++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(3 + crnd() * 4, 1, 2.5 + crnd() * 3), cloudMat);
        m.position.set(t * 2.4 - teile, 0, crnd() * 2 - 1);
        c.add(m);
      }
      c.position.set(crnd() * 90 - 45, 15 + crnd() * 4, crnd() * 90 - 45);
      c.userData.speed = 0.25 + crnd() * 0.3;
      scene.add(c);
      clouds.push(c);
    }
  }

  // ── Blockly ──
  // Beschriftung an die Kurs-Aufgaben angleichen (statt Blockly-Standard „falls/sonst")
  Blockly.Msg['CONTROLS_IF_MSG_IF'] = 'wenn';
  Blockly.Msg['CONTROLS_IF_MSG_ELSEIF'] = 'sonst wenn';
  Blockly.Msg['CONTROLS_IF_MSG_ELSE'] = 'ansonsten';
  Blockly.Msg['CONTROLS_IF_MSG_THEN'] = 'dann';
  Blockly.Msg['CONTROLS_REPEAT_TITLE'] = 'wiederhole %1 mal';

  const theme = Blockly.Theme.defineTheme('midcraft', {
    base: Blockly.Themes.Classic,
    startHats: true,
    fontStyle: { family: 'system-ui, sans-serif', size: 12.5 },
    componentStyles: {
      toolboxBackgroundColour: '#1e293b',
      toolboxForegroundColour: '#f1f5f9',
      flyoutBackgroundColour: '#324357',
      flyoutForegroundColour: '#f1f5f9',
      flyoutOpacity: 0.97,
      scrollbarColour: '#64748b',
      insertionMarkerColour: '#ffffff',
    },
  });
  const workspace = Blockly.inject('blockly', {
    toolbox: window.MIDCRAFT_TOOLBOX,
    renderer: 'zelos',
    theme,
    trashcan: true,
    sounds: false,
    zoom: { controls: true, wheel: true, startScale: 0.78, minScale: 0.4, maxScale: 1.6 },
    move: { scrollbars: true, drag: true, wheel: true },
    grid: { spacing: 24, length: 3, colour: '#3a4a5c', snap: false },
  });

  // ── Interpreter ──
  const btnRun = document.getElementById('btn-run');
  const btnStop = document.getElementById('btn-stop');
  const interpreter = new Interpreter({
    workspace, agent, world,
    onStatus: toast,
    onRunStateChange: running => {
      btnRun.disabled = running;
      btnStop.disabled = !running;
      if (!running) storage.scheduleAutosave(); // Agentenposition nach jedem Lauf sichern
    },
    sounds,
  });

  const TEMPO_MS = { 1: 800, 2: 500, 3: 300, 4: 150, 5: 70 };
  const tempoSlider = document.getElementById('tempo');
  const applyTempo = () => interpreter.setSpeed(TEMPO_MS[tempoSlider.value] || 300);
  tempoSlider.addEventListener('input', applyTempo);
  applyTempo();

  // ── Speicherung ──
  const storage = new Storage({ world, agent, getWorkspace: () => workspace, onStatus: toast });
  const loaded = storage.loadLocal();
  if (!loaded) world.generateGround();

  world.onChange = () => storage.scheduleAutosave();
  workspace.addChangeListener(e => {
    if (e.isUiEvent) return;
    storage.scheduleAutosave();
  });

  // ── Manuelles Bauen mit der Maus ──
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.02, 1.02),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })
  );
  ghost.visible = false;
  scene.add(ghost);

  function pickCell(ev) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return world.raycast(raycaster);
  }

  function placeTargetFrom(hit) {
    return {
      x: hit.cell.x + hit.normal.x,
      y: hit.cell.y + hit.normal.y,
      z: hit.cell.z + hit.normal.z,
    };
  }

  function isAgentCell(c) {
    return c.x === agent.x && c.y === agent.y && c.z === agent.z;
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  let downInfo = null;
  canvas.addEventListener('pointerdown', e => {
    if (spielmodus.aktiv()) return;
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button, shift: e.shiftKey };
  });

  canvas.addEventListener('pointerup', e => {
    if (spielmodus.aktiv()) return;
    if (!downInfo || e.button !== downInfo.button) return;
    const moved = Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y);
    const held = performance.now() - downInfo.t;
    const info = downInfo;
    downInfo = null;
    if (moved > 6 || held > 400) return; // war Kamerabewegung, kein Klick

    const hit = pickCell(e);
    if (!hit) return;

    const remove = info.button === 2 || (info.button === 0 && info.shift);
    if (remove) {
      world.remove(hit.cell.x, hit.cell.y, hit.cell.z);
      sounds.destroy();
    } else if (info.button === 0) {
      const t = placeTargetFrom(hit);
      if (!world.inBounds(t.x, t.y, t.z)) {
        toast('Hier ist die Welt zu Ende!', 'warn');
      } else if (isAgentCell(t)) {
        toast('Da schwebt der Agent!', 'warn');
      } else if (!world.has(t.x, t.y, t.z)) {
        world.set(t.x, t.y, t.z, selectedMaterial);
        sounds.place();
      }
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (spielmodus.aktiv()) { ghost.visible = false; return; }
    if (downInfo) { ghost.visible = false; return; }
    const hit = pickCell(e);
    if (!hit) { ghost.visible = false; return; }
    if (e.shiftKey) {
      // Entfernen-Vorschau: markiert den getroffenen Block rötlich
      ghost.material.color.set(0xff4444);
      ghost.position.copy(world.cellToPos(hit.cell.x, hit.cell.y, hit.cell.z));
      ghost.visible = true;
    } else {
      const t = placeTargetFrom(hit);
      if (world.inBounds(t.x, t.y, t.z) && !world.has(t.x, t.y, t.z) && !isAgentCell(t)) {
        ghost.material.color.set(0xffffff);
        ghost.position.copy(world.cellToPos(t.x, t.y, t.z));
        ghost.visible = true;
      } else {
        ghost.visible = false;
      }
    }
  });
  canvas.addEventListener('pointerleave', () => { ghost.visible = false; });

  // ── Block-Partikel beim Setzen/Abbauen ──
  const particles = [];
  const particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  let pseed = 99;
  const prnd = () => (pseed = (pseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  world.onEffect = (art, x, y, z, matId) => {
    const def = MATERIALS[matId];
    if (!def) return;
    const mitte = world.cellToPos(x, y, z);
    const anzahl = art === 'remove' ? 10 : 5;
    for (let i = 0; i < anzahl; i++) {
      const m = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({
        color: def.color, transparent: true, opacity: 1,
      }));
      m.material.color.multiplyScalar(0.75 + prnd() * 0.4);
      m.position.set(mitte.x + prnd() - 0.5, mitte.y + prnd() - 0.5, mitte.z + prnd() - 0.5);
      m.userData.vel = new THREE.Vector3((prnd() - 0.5) * 3, 1.5 + prnd() * 2.5, (prnd() - 0.5) * 3);
      m.userData.leben = 0.5;
      scene.add(m);
      particles.push(m);
    }
  };
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.userData.leben -= dt;
      if (p.userData.leben <= 0) {
        scene.remove(p);
        p.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.userData.vel.y -= 9 * dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.material.opacity = Math.min(1, p.userData.leben * 3);
      p.rotation.x += dt * 6;
      p.rotation.y += dt * 5;
    }
  }

  // ── Spielmodus (Ego-Ansicht wie im Klötzchen-Spiel) ──
  const spielmodus = (() => {
    const plc = new THREE.PointerLockControls(camera, canvas);
    const hintEl = document.getElementById('hint');
    const crosshair = document.getElementById('crosshair');
    const btnMode = document.getElementById('btn-mode');
    const HINT_ORBIT = hintEl.innerHTML;
    const HINT_SPIEL = '⌨️ <b>WASD</b> = laufen · Maus = umsehen · <b>Leertaste/Umschalt</b> = hoch/runter · ' +
      '<b>Linksklick = abbauen</b> · <b>Rechtsklick = bauen</b> · <b>Esc</b> = zurück zur Bau-Ansicht';
    const keys = new Set();
    let bobPhase = 0, bobAlt = 0;

    window.addEventListener('keydown', e => {
      if (plc.isLocked) keys.add(e.code);
      if (plc.isLocked && e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', e => keys.delete(e.code));

    function betreten() {
      // Auf Augenhöhe hinter dem Agenten starten — in seiner Blickrichtung
      const p = world.cellToPos(agent.x, agent.y, agent.z);
      const f = agent.headingVec();
      camera.position.set(p.x - f.dx * 3.5, p.y + 1.1, p.z - f.dz * 3.5);
      camera.lookAt(p.x + f.dx * 4, p.y + 0.4, p.z + f.dz * 4);
      controls.enabled = false;
      plc.lock();
    }

    // Schwarzer Zielrahmen um den anvisierten Block (wie im Vorbild)
    const zielRahmen = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005)),
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 })
    );
    zielRahmen.visible = false;
    scene.add(zielRahmen);

    plc.addEventListener('lock', () => {
      crosshair.classList.remove('hidden');
      handEl.classList.remove('hidden');
      hintEl.innerHTML = HINT_SPIEL;
      btnMode.textContent = '🎥 Bau-Ansicht';
      ghost.visible = false;
      camera.fov = 75; // weiteres Sichtfeld für das Spielgefühl
      camera.updateProjectionMatrix();
    });
    plc.addEventListener('unlock', () => {
      crosshair.classList.add('hidden');
      handEl.classList.add('hidden');
      hintEl.innerHTML = HINT_ORBIT;
      btnMode.textContent = '🎮 Spielmodus';
      keys.clear();
      zielRahmen.visible = false;
      camera.fov = 55;
      camera.updateProjectionMatrix();
      // Orbit-Kamera weich übernehmen: Ziel ein Stück in Blickrichtung
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      controls.target.copy(camera.position).addScaledVector(dir, 8);
      controls.enabled = true;
    });

    btnMode.addEventListener('click', () => { plc.isLocked ? plc.unlock() : betreten(); });

    // Falls der Browser den Maus-Fang verweigert (eingebettete Ansicht, Fenster ohne Fokus)
    document.addEventListener('pointerlockerror', () => {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      controls.target.copy(camera.position).addScaledVector(dir, 8);
      controls.enabled = true;
      toast('Spielmodus ging nicht los — Fenster anklicken und nochmal probieren.', 'warn');
    });

    // Bauen mit Fadenkreuz: links = abbauen, rechts = platzieren
    canvas.addEventListener('mousedown', e => {
      if (!plc.isLocked) return;
      handEl.classList.add('swing');
      setTimeout(() => handEl.classList.remove('swing'), 130);
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      raycaster.far = 8; // Reichweite wie im Vorbild
      const hit = world.raycast(raycaster);
      raycaster.far = Infinity;
      if (!hit) return;
      if (e.button === 0) {
        world.remove(hit.cell.x, hit.cell.y, hit.cell.z);
        sounds.destroy();
      } else if (e.button === 2) {
        const t = placeTargetFrom(hit);
        const kamera = camera.position;
        const eigeneZelle = Math.abs(world.cellToPos(t.x, t.y, t.z).x - kamera.x) < 0.9 &&
                            Math.abs(world.cellToPos(t.x, t.y, t.z).y - kamera.y) < 1.4 &&
                            Math.abs(world.cellToPos(t.x, t.y, t.z).z - kamera.z) < 0.9;
        if (world.inBounds(t.x, t.y, t.z) && !world.has(t.x, t.y, t.z) && !isAgentCell(t) && !eigeneZelle) {
          world.set(t.x, t.y, t.z, selectedMaterial);
          sounds.place();
        }
      }
    });

    function update(dt) {
      if (!plc.isLocked) return;
      // Zielrahmen auf dem anvisierten Block nachführen
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      raycaster.far = 8;
      const hit = world.raycast(raycaster);
      raycaster.far = Infinity;
      if (hit) {
        zielRahmen.position.copy(world.cellToPos(hit.cell.x, hit.cell.y, hit.cell.z));
        zielRahmen.visible = true;
      } else {
        zielRahmen.visible = false;
      }
      const tempo = 7.5 * dt;
      if (keys.has('KeyW') || keys.has('ArrowUp')) plc.moveForward(tempo);
      if (keys.has('KeyS') || keys.has('ArrowDown')) plc.moveForward(-tempo);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) plc.moveRight(-tempo);
      if (keys.has('KeyD') || keys.has('ArrowRight')) plc.moveRight(tempo);
      if (keys.has('Space')) camera.position.y += tempo;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) camera.position.y -= tempo;
      camera.position.y = Math.max(0.2, Math.min(20, camera.position.y));
      camera.position.x = Math.max(-23, Math.min(23, camera.position.x));
      camera.position.z = Math.max(-23, Math.min(23, camera.position.z));
      // Dezentes Kopfwippen beim Laufen
      const laeuft = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k => keys.has(k));
      bobPhase = laeuft ? bobPhase + dt * 9 : 0;
      const bobNeu = laeuft ? Math.sin(bobPhase) * 0.04 : 0;
      camera.position.y += bobNeu - bobAlt;
      bobAlt = bobNeu;
    }

    return { aktiv: () => plc.isLocked, update };
  })();

  // ── Chat ──
  const chatInput = document.getElementById('chat-input');
  const runChat = () => {
    const cmd = chatInput.value.trim();
    if (!cmd) return;
    chatInput.value = '';
    interpreter.runCommand(cmd);
  };
  document.getElementById('chat-send').addEventListener('click', runChat);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') runChat(); });

  // ── Buttons ──
  btnRun.addEventListener('click', () => {
    const tops = workspace.getTopBlocks(true).filter(b => b.type === 'ereignis_chat');
    if (!tops.length) {
      toast('Bau zuerst ein Programm mit dem ⚡-Startblock!', 'warn');
      return;
    }
    // Ausgewähltes Programm bevorzugen, sonst das einzige, sonst nachfragen
    const sel = Blockly.getSelected && Blockly.getSelected();
    let target = null;
    if (sel) {
      let root = sel.getRootBlock ? sel.getRootBlock() : null;
      if (root && root.type === 'ereignis_chat') target = root;
    }
    if (!target && tops.length === 1) target = tops[0];
    if (!target) {
      toast('Mehrere Programme gefunden — tippe den Befehl unten ein: ' +
        tops.map(b => b.getFieldValue('BEFEHL')).join(', '), 'warn');
      return;
    }
    interpreter.runTopBlock(target);
  });

  btnStop.addEventListener('click', () => interpreter.stop());

  document.getElementById('btn-agent-home').addEventListener('click', async () => {
    if (interpreter.running) { toast('Erst ⏹ Stopp drücken.', 'warn'); return; }
    await agent.teleportHome(300);
    storage.scheduleAutosave();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('Wirklich die ganze Welt zurücksetzen?\nAlles Gebaute wird gelöscht.\n(Deine Programme bleiben erhalten.)')) return;
    interpreter.stop();
    world.clearAll();
    world.generateGround();
    agent.setState(agent.spawn);
    storage.scheduleAutosave();
    toast('🧹 Welt zurückgesetzt.', 'success');
  });

  document.getElementById('btn-shot').addEventListener('click', () => {
    renderer.render(scene, camera);
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      a.href = URL.createObjectURL(blob);
      a.download = `midcraft-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    toast('📸 Foto gespeichert — ab damit in den Zoom-Chat!', 'success');
  });

  document.getElementById('btn-export').addEventListener('click', () => storage.exportFile());
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) storage.importFile(fileInput.files[0]);
    fileInput.value = '';
  });

  // ── Aufgabenpanel ──
  const tasksPanel = document.getElementById('tasks-panel');
  const tasksBody = document.getElementById('tasks-body');
  for (const group of TASK_GROUPS) {
    const h = document.createElement('div');
    h.className = 'task-block-title';
    h.textContent = group.title;
    tasksBody.appendChild(h);
    for (const t of group.tasks) {
      const d = document.createElement('details');
      d.className = 'task';
      d.innerHTML =
        `<summary>${t.title}<span class="task-cmd">${t.cmd}</span></summary>` +
        `<div class="task-text">${t.text}<span class="tip">💡 ${t.tip}</span></div>`;
      tasksBody.appendChild(d);
    }
  }
  document.getElementById('btn-tasks').addEventListener('click', () => tasksPanel.classList.toggle('hidden'));
  document.getElementById('btn-tasks-close').addEventListener('click', () => tasksPanel.classList.add('hidden'));

  // ── Hilfe-Overlay ──
  const helpOverlay = document.getElementById('help-overlay');
  const zeigeHilfe = () => { if (interpreter.running) interpreter.stop(); helpOverlay.classList.remove('hidden'); };
  document.getElementById('btn-help').addEventListener('click', zeigeHilfe);
  const hilfeZu = () => helpOverlay.classList.add('hidden');
  document.getElementById('btn-help-close').addEventListener('click', hilfeZu);
  document.getElementById('btn-help-close-x').addEventListener('click', hilfeZu);
  // Klick auf den dunklen Hintergrund schließt ebenfalls — das versucht jeder intuitiv
  helpOverlay.addEventListener('click', e => { if (e.target === helpOverlay) hilfeZu(); });

  // ── Begrüßung beim allerersten Start ──
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const WELCOME_KEY = 'midcraft-willkommen-gesehen';
  let schonGesehen = false;
  try { schonGesehen = !!localStorage.getItem(WELCOME_KEY); } catch (e) { /* z. B. blockierte Cookies */ }
  if (!schonGesehen) welcomeOverlay.classList.remove('hidden');
  const willkommenZu = () => {
    welcomeOverlay.classList.add('hidden');
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { /* egal */ }
    chatInput.focus();
  };
  document.getElementById('btn-welcome-close').addEventListener('click', willkommenZu);
  document.getElementById('btn-welcome-close-x').addEventListener('click', willkommenZu);
  welcomeOverlay.addEventListener('click', e => { if (e.target === welcomeOverlay) willkommenZu(); });

  // Scroll-Hinweis in Overlays: „▼" zeigen, solange unten Inhalt verborgen ist
  const scrollHinweisUpdates = [];
  document.querySelectorAll('.overlay-box').forEach(box => {
    const update = () => {
      const scrollbar = box.scrollHeight - box.clientHeight > 8;
      const amEnde = box.scrollTop + box.clientHeight >= box.scrollHeight - 28;
      box.classList.toggle('zeig-scrollhinweis', scrollbar && !amEnde);
    };
    scrollHinweisUpdates.push(update);
    box.addEventListener('scroll', update);
    new ResizeObserver(update).observe(box);
  });
  const aktualisiereScrollhinweise = () => scrollHinweisUpdates.forEach(f => f());
  // Beim Öffnen der Overlays sofort prüfen (nicht auf den ResizeObserver verlassen)
  document.getElementById('btn-help').addEventListener('click', () => setTimeout(aktualisiereScrollhinweise, 0));
  if (!welcomeOverlay.classList.contains('hidden')) setTimeout(aktualisiereScrollhinweise, 0);

  // Esc schließt offene Overlays (außer der Fehlermeldung)
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    helpOverlay.classList.add('hidden');
    welcomeOverlay.classList.add('hidden');
  });

  // ── Sichtbare Speicher-Bestätigung: nimmt die Angst vorm Neuladen ──
  const saveEl = document.getElementById('savestate');
  let saveTimer = null;
  storage.onSaved = () => {
    saveEl.textContent = '✓ gespeichert';
    saveEl.classList.add('sichtbar');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveEl.classList.remove('sichtbar'), 1800);
  };

  // ── Größenanpassung ──
  function resize() {
    const wrap = document.getElementById('scene-wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    Blockly.svgResize(workspace);
  }
  new ResizeObserver(resize).observe(document.getElementById('scene-wrap'));
  new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.getElementById('right'));
  window.addEventListener('resize', resize);
  resize();

  // Viele Kinder haben Zoom und die App gleichzeitig auf einem Bildschirm.
  // Einmalig darauf hinweisen, wenn es dadurch sehr eng wird.
  if (window.innerWidth < 1100) {
    setTimeout(() => toast('Tipp: Mach das Fenster größer oder drücke F11 — dann hast du mehr Platz zum Bauen.', 'warn'), 1500);
  }

  // ── Render-Schleife ──
  let lastTick = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    now = now || performance.now();
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    world.rebuildIfDirty();
    agent.update(now);
    if (spielmodus.aktiv()) {
      spielmodus.update(dt);
    } else {
      controls.update(); // OrbitControls positioniert die Kamera auch ohne Eingabe
    }
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 55) c.position.x = -55;
    }
    updateParticles(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);

  if (loaded) toast('Willkommen zurück! Deine Welt wurde geladen.', 'success');

  // Für Tests und Fehlersuche
  window.MC = { world, agent, workspace, interpreter, storage, WORLD };
}

// Start mit Auffangnetz: Scheitert der Aufbau, sieht das Kind eine Erklärung
// statt eines schwarzen Bildschirms.
(function boot() {
  try {
    main();
  } catch (err) {
    console.error('MidCraft Studio konnte nicht starten:', err);
    if (window.MIDCRAFT_FATAL) {
      window.MIDCRAFT_FATAL('Die 3D-Welt konnte auf diesem Gerät nicht aufgebaut werden.');
    }
  }
})();
