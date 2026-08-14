// Der Agent: schwebender Roboter mit Gesicht und Richtungsanzeige.
// Blickrichtungen: 0 = Nord (-z), 1 = Ost (+x), 2 = Süd (+z), 3 = West (-x)
'use strict';

const HEADINGS = [
  { dx: 0, dz: -1 },
  { dx: 1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: -1, dz: 0 },
];

class Agent {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.spawn = { x: 20, y: 1, z: 20, h: 0 };
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.z = this.spawn.z;
    this.h = this.spawn.h;

    this.group = this.buildMesh();
    scene.add(this.group);

    this.anim = null;      // laufende Animation
    this.bobPhase = Math.random() * Math.PI * 2;
    this.syncMesh();
  }

  buildMesh() {
    const g = new THREE.Group();

    // Körper
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.62, 0.72),
      new THREE.MeshLambertMaterial({ color: 0xdde5ee })
    );
    body.position.y = 0.05;
    g.add(body);

    // Visier (Gesichtsfläche vorn = -z)
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.34, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x14212e })
    );
    visor.position.set(0, 0.1, -0.36);
    g.add(visor);

    // Augen
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x5df2ff });
    for (const ex of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.03), eyeMat);
      eye.position.set(ex, 0.12, -0.395);
      g.add(eye);
    }

    // Mund
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.03), eyeMat);
    mouth.position.set(0, -0.02, -0.395);
    g.add(mouth);

    // Richtungs-Pfeil (orange Nase unten vorn)
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.3, 4),
      new THREE.MeshLambertMaterial({ color: 0xff8c1a })
    );
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.set(0, -0.22, -0.42);
    g.add(nose);

    // Antenne
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x8899aa })
    );
    stalk.position.y = 0.46;
    g.add(stalk);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5555 })
    );
    bulb.position.y = 0.6;
    g.add(bulb);
    this.bulb = bulb;

    // Weicher Schatten
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.48;
    g.add(shadow);

    return g;
  }

  headingVec() { return HEADINGS[this.h]; }

  rotY() { return -this.h * Math.PI / 2; }

  basePos() {
    return this.world.cellToPos(this.x, this.y, this.z);
  }

  syncMesh() {
    const p = this.basePos();
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.y = this.rotY();
  }

  // Zielzelle relativ zur Blickrichtung
  cellInDir(word) {
    const f = this.headingVec();
    switch (word) {
      case 'vorne':   return { x: this.x + f.dx, y: this.y, z: this.z + f.dz };
      case 'hinten':  return { x: this.x - f.dx, y: this.y, z: this.z - f.dz };
      case 'unten':   return { x: this.x, y: this.y - 1, z: this.z };
      case 'oben':    return { x: this.x, y: this.y + 1, z: this.z };
      case 'links': {
        const l = HEADINGS[(this.h + 3) % 4];
        return { x: this.x + l.dx, y: this.y, z: this.z + l.dz };
      }
      case 'rechts': {
        const r = HEADINGS[(this.h + 1) % 4];
        return { x: this.x + r.dx, y: this.y, z: this.z + r.dz };
      }
    }
    return null;
  }

  moveTarget(dirWord) {
    switch (dirWord) {
      case 'VOR':     return this.cellInDir('vorne');
      case 'ZURUECK': return this.cellInDir('hinten');
      case 'HOCH':    return this.cellInDir('oben');
      case 'RUNTER':  return this.cellInDir('unten');
    }
    return null;
  }

  canOccupy(c) {
    return c && this.world.inBounds(c.x, c.y, c.z) && !this.world.has(c.x, c.y, c.z);
  }

  // ── Animationen (Promise-basiert, rAF-getrieben über update()) ──

  animate(spec, durMs) {
    return new Promise(resolve => {
      const anim = { ...spec, start: performance.now(), dur: Math.max(40, durMs), resolve, done: false };
      this.anim = anim;
      // Fallback: auch ohne laufende Render-Schleife (Tab im Hintergrund) auflösen
      setTimeout(() => this.finishAnim(anim), anim.dur + 80);
    });
  }

  finishAnim(a) {
    if (!a || a.done) return;
    a.done = true;
    if (this.anim === a) this.anim = null;
    this.group.visible = true;
    this.syncMesh();
    a.resolve();
  }

  // Ein Schritt in eine Richtung. true = bewegt, false = blockiert.
  async moveStep(dirWord, durMs) {
    const target = this.moveTarget(dirWord);
    if (this.canOccupy(target)) {
      const from = this.basePos();
      this.x = target.x; this.y = target.y; this.z = target.z;
      const to = this.basePos();
      await this.animate({ type: 'move', from, to }, durMs);
      return true;
    }
    // Blockiert: kurzer "Rempler"
    const from = this.basePos();
    const t = this.moveTarget(dirWord) || { x: this.x, y: this.y, z: this.z };
    const to = new THREE.Vector3(
      from.x + (this.world.cellToPos(t.x, t.y, t.z).x - from.x) * 0.25,
      from.y + (this.world.cellToPos(t.x, t.y, t.z).y - from.y) * 0.25,
      from.z + (this.world.cellToPos(t.x, t.y, t.z).z - from.z) * 0.25
    );
    await this.animate({ type: 'bump', from, to }, durMs);
    return false;
  }

  async turn(lr, durMs) {
    const oldH = this.h;
    this.h = lr === 'LINKS' ? (this.h + 3) % 4 : (this.h + 1) % 4;
    const delta = (lr === 'LINKS' ? 1 : -1) * Math.PI / 2;
    await this.animate({ type: 'turn', fromRot: -oldH * Math.PI / 2, delta }, durMs);
    return true;
  }

  async teleportHome(durMs) {
    this.x = this.spawn.x; this.z = this.spawn.z; this.h = this.spawn.h;
    // Falls der Startpunkt zugebaut wurde: auf die erste freie Zelle darüber ausweichen
    let y = this.spawn.y;
    while (y <= WORLD.YMAX && this.world.has(this.x, y, this.z)) y++;
    this.y = Math.min(y, WORLD.YMAX);
    // kurzes Blinken statt Flug
    await this.animate({ type: 'blink' }, Math.min(durMs, 350));
    this.syncMesh();
    return true;
  }

  setState(s) {
    if (!s) return;
    this.x = s.x; this.y = s.y; this.z = s.z; this.h = s.h || 0;
    this.syncMesh();
  }

  getState() {
    return { x: this.x, y: this.y, z: this.z, h: this.h };
  }

  update(now) {
    const a = this.anim;
    if (a) {
      let t = (now - a.start) / a.dur;
      if (t >= 1) {
        this.finishAnim(a);
      } else {
        const e = t * t * (3 - 2 * t); // smoothstep
        if (a.type === 'move') {
          this.group.position.lerpVectors(a.from, a.to, e);
        } else if (a.type === 'bump') {
          const k = t < 0.5 ? e * 2 : (1 - e) * 2;
          this.group.position.lerpVectors(a.from, a.to, Math.min(1, k));
        } else if (a.type === 'turn') {
          this.group.rotation.y = a.fromRot + a.delta * e;
        } else if (a.type === 'blink') {
          this.group.visible = (t * 8 | 0) % 2 === 0;
        }
      }
      if (!this.anim) this.group.visible = true;
    }
    // Schwebe-Bobbing
    const bob = Math.sin(now / 400 + this.bobPhase) * 0.05;
    const p = this.anim ? this.group.position : this.basePos();
    if (!this.anim) this.group.position.set(p.x, p.y + bob, p.z);
    // Antennenlicht pulsiert
    this.bulb.material.color.setHSL(0, 0.9, 0.5 + 0.15 * Math.sin(now / 300));
  }
}
