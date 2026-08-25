// Baustoffe der Welt. Reihenfolge = Reihenfolge in Palette und Blockly-Dropdown.
'use strict';

// pix: 16×16-Pixel-Art pro Blockseite (eigene Texturen im Klötzchen-Spiel-Stil, keine fremden Assets)
const MATERIALS = {
  gras:        { name: 'Gras',          color: 0x649735, vary: 0.05, pix: 'gras' },
  erde:        { name: 'Erde',          color: 0x7d5a3e, vary: 0.04, pix: 'erde' },
  stein:       { name: 'Stein',         color: 0x9aa0a6, vary: 0.03, pix: 'stein' },
  holz:        { name: 'Holz',          color: 0xb07b45, vary: 0,    pix: 'holz' },
  gold:        { name: 'Goldblock',     color: 0xf5c518, vary: 0, emissive: 0x332600, pix: 'gold' },
  wolle_rot:   { name: 'Wolle (rot)',   color: 0xe04848, vary: 0, pix: 'wolle' },
  wolle_blau:  { name: 'Wolle (blau)',  color: 0x3b6fd4, vary: 0, pix: 'wolle' },
  wolle_weiss: { name: 'Wolle (weiß)',  color: 0xf2f2f2, vary: 0, pix: 'wolle' },
};

const MATERIAL_ORDER = Object.keys(MATERIALS);
