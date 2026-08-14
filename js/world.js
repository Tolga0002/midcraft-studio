// Voxelwelt: Datenmodell (Map "x,y,z" -> Material) + Rendering als InstancedMesh je Material.
'use strict';

// ── 16×16-Pixel-Art-Texturen im Klötzchen-Spiel-Stil ─────────────────────────
// Eigene Zeichnungen, deterministischer Zufall — keine fremden Assets.

const PixelArt = (() => {
  let seed = 1;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = arr => arr[(rnd() * arr.length) | 0];

  function shade(hex, f) { // f > 0 heller, f < 0 dunkler
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    const m = v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }

  function canvasTexture(draw) {
    seed = 1234567;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 16;
    const g = cv.getContext('2d');
    draw(g);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.userData.canvas = cv;
    return tex;
  }

  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

  function noiseFill(g, base, tones, density) {
    g.fillStyle = shade(base, 0);
    g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (rnd() < density) px(g, x, y, shade(base, pick(tones)));
    }
  }

  const GRAS = 0x5aa843, ERDE = 0x8a5a34, STEIN = 0x8f9296, HOLZ = 0xb07b45, GOLD = 0xf5c518;

  function grasTop(g) { noiseFill(g, GRAS, [-0.14, -0.07, 0.08, 0.14, 0], 0.6); }
  function erde(g) { noiseFill(g, ERDE, [-0.16, -0.08, 0.08, 0.15], 0.55); }
  function grasSeite(g) {
    erde(g);
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 3; y++) px(g, x, y, shade(GRAS, pick([-0.12, 0, 0.1, -0.05])));
      if (rnd() < 0.65) px(g, x, 3, shade(GRAS, pick([-0.1, 0])));
      if (rnd() < 0.25) px(g, x, 4, shade(GRAS, -0.08));
    }
  }
  function stein(g) {
    noiseFill(g, STEIN, [-0.1, -0.05, 0.06, 0.1], 0.5);
    for (let i = 0; i < 5; i++) { // größere dunklere Flecken
      const x = (rnd() * 14) | 0, y = (rnd() * 14) | 0;
      const c = shade(STEIN, -0.16);
      px(g, x, y, c); px(g, x + 1, y, c); px(g, x, y + 1, c);
    }
  }
  function holz(g) {
    for (let r = 0; r < 4; r++) {           // 4 Bretter à 4 Pixel
      const tone = [0, -0.06, 0.05, -0.03][r];
      for (let y = r * 4; y < r * 4 + 3; y++)
        for (let x = 0; x < 16; x++)
          px(g, x, y, shade(HOLZ, tone + pick([-0.05, 0, 0.05]) * (rnd() < 0.4 ? 1 : 0)));
      for (let x = 0; x < 16; x++) px(g, x, r * 4 + 3, shade(HOLZ, -0.35)); // Fuge
      const sx = ((r * 5 + 3) % 16);        // versetzte Stoßkante
      for (let y = r * 4; y < r * 4 + 3; y++) px(g, sx, y, shade(HOLZ, -0.3));
    }
  }
  function gold(g) {
    noiseFill(g, GOLD, [-0.05, 0.05, 0], 0.4);
    for (let i = 0; i < 16; i++) { px(g, i, 0, shade(GOLD, -0.25)); px(g, i, 15, shade(GOLD, -0.25)); px(g, 0, i, shade(GOLD, -0.25)); px(g, 15, i, shade(GOLD, -0.25)); }
    for (let x = 4; x < 12; x++) for (let y = 4; y < 12; y++) px(g, x, y, shade(GOLD, 0.22));
    for (let x = 5; x < 11; x++) for (let y = 5; y < 11; y++) px(g, x, y, shade(GOLD, 0.05));
    px(g, 5, 5, shade(GOLD, 0.5)); px(g, 6, 5, shade(GOLD, 0.35)); px(g, 5, 6, shade(GOLD, 0.35));
  }
  function wolle(g, farbe) {
    noiseFill(g, farbe, [-0.08, -0.04, 0.05, 0.09], 0.5);
    for (let i = 0; i < 10; i++) { // Gewebe-Fäden
      const x = (rnd() * 15) | 0, y = (rnd() * 16) | 0;
      px(g, x, y, shade(farbe, -0.12)); px(g, x + 1, y, shade(farbe, -0.12));
    }
  }

  // liefert { top, side, bottom } CanvasTexturen für ein Material
  function fuer(id, def) {
    switch (def.pix) {
      case 'gras': {
        const t = canvasTexture(grasTop), s = canvasTexture(grasSeite), b = canvasTexture(erde);
        return { top: t, side: s, bottom: b };
      }
      case 'erde': { const t = canvasTexture(erde); return { top: t, side: t, bottom: t }; }
      case 'stein': { const t = canvasTexture(stein); return { top: t, side: t, bottom: t }; }
      case 'holz': { const t = canvasTexture(holz); return { top: t, side: t, bottom: t }; }
      case 'gold': { const t = canvasTexture(gold); return { top: t, side: t, bottom: t }; }
      case 'wolle': { const t = canvasTexture(g => wolle(g, def.color)); return { top: t, side: t, bottom: t }; }
      default: { const t = canvasTexture(g => noiseFill(g, def.color, [0], 0)); return { top: t, side: t, bottom: t }; }
    }
  }

  return { fuer };
})();

const WORLD = {
  W: 40,          // x: 0..39
  D: 40,          // z: 0..39
  YMIN: -2,       // zwei Schichten unter der Grasoberfläche (für Gräben)
  YMAX: 9,        // 12 Schichten insgesamt
  SURFACE: 0,     // y der Grasschicht; der Agent schwebt auf y=1
};

class VoxelWorld {
  constructor(scene) {
    this.scene = scene;
    this.map = new Map();
    this.meshes = new Map();       // materialId -> InstancedMesh
    this.meshCells = new Map();    // materialId -> [ [x,y,z], ... ] parallel zu instanceId
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    // Pro Material: 6 Seiten-Materialien (BoxGeometry-Reihenfolge: +x,-x,+y,-y,+z,-z)
    this.threeMaterials = new Map();
    this.faceTextures = new Map();
    for (const [id, def] of Object.entries(MATERIALS)) {
      const tex = PixelArt.fuer(id, def);
      this.faceTextures.set(id, tex);
      const mk = map => new THREE.MeshLambertMaterial({ map, emissive: def.emissive || 0x000000 });
      const side = mk(tex.side), top = mk(tex.top), bottom = mk(tex.bottom);
      this.threeMaterials.set(id, [side, side, top, bottom, side, side]);
    }
    this.dirty = false;
    this.onChange = null; // Hook für Autosave
  }

  key(x, y, z) { return x + ',' + y + ',' + z; }

  inBounds(x, y, z) {
    return x >= 0 && x < WORLD.W && z >= 0 && z < WORLD.D && y >= WORLD.YMIN && y <= WORLD.YMAX;
  }

  get(x, y, z) { return this.map.get(this.key(x, y, z)) || null; }
  has(x, y, z) { return this.map.has(this.key(x, y, z)); }

  set(x, y, z, materialId) {
    if (!this.inBounds(x, y, z) || !MATERIALS[materialId]) return false;
    this.map.set(this.key(x, y, z), materialId);
    this.markDirty();
    if (this.onEffect) this.onEffect('place', x, y, z, materialId);
    return true;
  }

  remove(x, y, z) {
    const prev = this.map.get(this.key(x, y, z));
    const ok = this.map.delete(this.key(x, y, z));
    if (ok) {
      this.markDirty();
      if (this.onEffect) this.onEffect('remove', x, y, z, prev);
    }
    return ok;
  }

  markDirty() {
    this.dirty = true;
    if (this.onChange) this.onChange();
  }

  clearAll() {
    this.map.clear();
    this.markDirty();
  }

  generateGround() {
    for (let x = 0; x < WORLD.W; x++) {
      for (let z = 0; z < WORLD.D; z++) {
        this.map.set(this.key(x, 0, z), 'gras');
        this.map.set(this.key(x, -1, z), 'erde');
        this.map.set(this.key(x, -2, z), 'stein');
      }
    }
    this.markDirty();
  }

  // Zellmitte in Three.js-Koordinaten (Welt um den Ursprung zentriert)
  cellToPos(x, y, z) {
    return new THREE.Vector3(x - WORLD.W / 2 + 0.5, y + 0.5, z - WORLD.D / 2 + 0.5);
  }

  rebuildIfDirty() {
    if (!this.dirty) return;
    this.dirty = false;

    // Zellen nach Material gruppieren
    const groups = new Map();
    for (const id of MATERIAL_ORDER) groups.set(id, []);
    for (const [k, mat] of this.map) {
      const parts = k.split(',');
      groups.get(mat).push([+parts[0], +parts[1], +parts[2]]);
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (const [matId, cells] of groups) {
      let mesh = this.meshes.get(matId);
      if (mesh && mesh.instanceMatrix.count < cells.length) {
        this.scene.remove(mesh);
        mesh.dispose();
        mesh = null;
      }
      if (!mesh) {
        const capacity = Math.max(64, Math.ceil(cells.length * 1.5));
        mesh = new THREE.InstancedMesh(this.geometry, this.threeMaterials.get(matId), capacity);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.userData.materialId = matId;
        this.scene.add(mesh);
        this.meshes.set(matId, mesh);
      }
      const def = MATERIALS[matId];
      for (let i = 0; i < cells.length; i++) {
        const [x, y, z] = cells[i];
        dummy.position.copy(this.cellToPos(x, y, z));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // Dezente, deterministische Helligkeitsvariation (multipliziert die Textur)
        color.set(0xffffff);
        if (def.vary) {
          const h = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0;
          const f = 1 - def.vary + (h % 1000) / 1000 * def.vary * 2;
          color.multiplyScalar(f);
        }
        mesh.setColorAt(i, color);
      }
      mesh.count = cells.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.meshCells.set(matId, cells);
    }
  }

  // Raycast gegen alle Blöcke. Liefert {cell, normal, materialId} oder null.
  raycast(raycaster) {
    const objects = [...this.meshes.values()].filter(m => m.count > 0);
    const hits = raycaster.intersectObjects(objects, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const cells = this.meshCells.get(hit.object.userData.materialId);
    if (!cells || hit.instanceId >= cells.length) return null;
    const [x, y, z] = cells[hit.instanceId];
    const n = hit.face.normal; // Instanzen sind nur verschoben, Normale bleibt gültig
    return {
      cell: { x, y, z },
      normal: { x: Math.round(n.x), y: Math.round(n.y), z: Math.round(n.z) },
      materialId: hit.object.userData.materialId,
    };
  }

  serialize() {
    return Object.fromEntries(this.map);
  }

  loadFrom(obj) {
    this.map.clear();
    for (const [k, mat] of Object.entries(obj)) {
      if (!MATERIALS[mat]) continue;
      const p = k.split(',').map(Number);
      if (p.length !== 3 || !p.every(Number.isInteger) || !this.inBounds(p[0], p[1], p[2])) continue;
      this.map.set(this.key(p[0], p[1], p[2]), mat);
    }
    this.markDirty();
  }
}
