// Speichern & Laden: localStorage-Autosave + Export/Import als JSON-Datei.
'use strict';

const SAVE_KEY = 'midcraft-studio-save-v1';

class Storage {
  constructor({ world, agent, getWorkspace, onStatus }) {
    this.world = world;
    this.agent = agent;
    this.getWorkspace = getWorkspace;
    this.onStatus = onStatus || (() => {});
    this.timer = null;
  }

  snapshot() {
    return {
      version: 1,
      app: 'MidCraft Studio',
      datum: new Date().toISOString(),
      welt: this.world.serialize(),
      agent: this.agent.getState(),
      programme: Blockly.serialization.workspaces.save(this.getWorkspace()),
    };
  }

  scheduleAutosave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveLocal(), 900);
    // Sicherheitsnetz: Auch bei pausenloser Bautätigkeit spätestens alle 15 s sichern
    if (!this.sicherung) {
      this.sicherung = setInterval(() => this.saveLocal(), 15000);
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.snapshot()));
      if (this.onSaved) this.onSaved();
    } catch (e) {
      console.warn('Autosave fehlgeschlagen:', e);
      this.onStatus('Speichern klappt gerade nicht — nutze 💾 Mitnehmen, damit nichts verloren geht.', 'warn');
    }
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      return this.applySnapshot(JSON.parse(raw));
    } catch (e) {
      console.warn('Laden fehlgeschlagen:', e);
      return false;
    }
  }

  applySnapshot(data) {
    if (!data || !data.welt) return false;
    this.world.loadFrom(data.welt);
    this.agent.setState(data.agent);
    if (data.programme) {
      const ws = this.getWorkspace();
      ws.clear();
      Blockly.serialization.workspaces.load(data.programme, ws);
    }
    return true;
  }

  exportFile() {
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = `midcraft-welt-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.onStatus('💾 Welt und Programme als Datei gespeichert!', 'success');
  }

  importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ok = this.applySnapshot(JSON.parse(reader.result));
        if (ok) {
          this.saveLocal();
          this.onStatus('📂 Welt und Programme geladen!', 'success');
        } else {
          this.onStatus('Diese Datei ist keine MidCraft-Welt.', 'warn');
        }
      } catch (e) {
        this.onStatus('Datei konnte nicht gelesen werden.', 'warn');
      }
    };
    reader.readAsText(file);
  }
}
