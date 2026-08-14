// Führt Blockly-Programme Schritt für Schritt aus: Baum-Interpreter mit
// Animation, Block-Highlighting und Stopp-Möglichkeit.
'use strict';

class StopSignal extends Error {}
class ReturnSignal extends Error {
  constructor(value) { super('return'); this.value = value; }
}

class Interpreter {
  constructor({ workspace, agent, world, onStatus, onRunStateChange, sounds }) {
    this.workspace = workspace;
    this.agent = agent;
    this.world = world;
    this.onStatus = onStatus || (() => {});
    this.onRunStateChange = onRunStateChange || (() => {});
    this.sounds = sounds;
    this.running = false;
    this.stopped = false;
    this.stepMs = 300;
    this.goldFound = false;
    this.actionsInIteration = 0;
  }

  setSpeed(ms) { this.stepMs = ms; }

  stop() {
    if (this.running) this.stopped = true;
  }

  highlight(id) {
    try { this.workspace.highlightBlock(id); } catch (e) { /* egal */ }
  }

  checkStop() {
    if (this.stopped) throw new StopSignal();
  }

  async sleep(ms) {
    await new Promise(r => setTimeout(r, ms));
    this.checkStop();
  }

  findProgram(cmd) {
    const norm = s => (s || '').trim().toLowerCase();
    return this.workspace.getTopBlocks(false).find(
      b => b.type === 'ereignis_chat' && norm(b.getFieldValue('BEFEHL')) === norm(cmd) && b.isEnabled()
    );
  }

  listCommands() {
    return this.workspace.getTopBlocks(false)
      .filter(b => b.type === 'ereignis_chat')
      .map(b => (b.getFieldValue('BEFEHL') || '').trim())
      .filter(Boolean);
  }

  async runCommand(cmd) {
    const prog = this.findProgram(cmd);
    if (!prog) {
      const known = this.listCommands();
      this.onStatus(
        known.length
          ? `Kein Programm mit Befehl »${cmd}«. Es gibt: ${known.join(', ')}`
          : `Kein Programm mit Befehl »${cmd}«. Bau zuerst einen ⚡-Startblock!`,
        'warn'
      );
      return;
    }
    await this.runTopBlock(prog);
  }

  async runTopBlock(hatBlock) {
    if (this.running) {
      this.onStatus('Es läuft schon ein Programm — erst ⏹ Stopp drücken.', 'warn');
      return;
    }
    this.running = true;
    this.stopped = false;
    this.goldFound = false;
    this.vars = new Map();
    this.callDepth = 0;
    this.onRunStateChange(true);
    try {
      this.highlight(hatBlock.id);
      await this.sleep(Math.min(this.stepMs, 250));
      await this.execStack(hatBlock.getNextBlock());
      this.checkStop(); // Stopp während der letzten Animation korrekt melden
      this.onStatus('✅ Programm fertig!', 'success');
    } catch (e) {
      if (e instanceof StopSignal) {
        this.onStatus('⏹ Gestoppt.', 'warn');
      } else {
        console.error(e);
        this.onStatus('Fehler im Programm: ' + e.message, 'warn');
      }
    } finally {
      this.running = false;
      this.stopped = false;
      this.highlight(null);
      this.onRunStateChange(false);
    }
  }

  async execStack(block) {
    while (block) {
      this.checkStop();
      if (block.isEnabled()) {
        this.highlight(block.id);
        await this.execBlock(block);
      }
      block = block.getNextBlock();
    }
  }

  async execBlock(b) {
    switch (b.type) {
      case 'agent_bewege': {
        const dir = b.getFieldValue('RICHTUNG');
        let n = Math.round(await this.evalValue(b.getInputTargetBlock('ANZAHL')));
        n = Math.max(0, Math.min(200, n || 0));
        for (let i = 0; i < n; i++) {
          this.checkStop();
          const ok = await this.agent.moveStep(dir, this.stepMs);
          this.actionsInIteration++;
          if (ok) { this.sounds?.move(); this.checkGold(); }
          else this.sounds?.bump();
        }
        break;
      }
      case 'agent_drehe': {
        await this.agent.turn(b.getFieldValue('DREHUNG'), this.stepMs);
        this.actionsInIteration++;
        break;
      }
      case 'agent_teleport': {
        await this.agent.teleportHome(this.stepMs);
        this.actionsInIteration++;
        break;
      }
      case 'agent_platziere': {
        const wo = b.getFieldValue('WO') === 'VORNE' ? 'vorne' : 'unten';
        const mat = b.getFieldValue('MATERIAL');
        const c = this.agent.cellInDir(wo);
        if (c && this.world.inBounds(c.x, c.y, c.z) && !this.world.has(c.x, c.y, c.z)) {
          this.world.set(c.x, c.y, c.z, mat);
          this.sounds?.place();
        } else {
          this.sounds?.bump();
        }
        this.actionsInIteration++;
        await this.sleep(this.stepMs);
        break;
      }
      case 'agent_zerstoere': {
        const wo = b.getFieldValue('WO') === 'VORNE' ? 'vorne' : 'unten';
        const c = this.agent.cellInDir(wo);
        if (c && this.world.has(c.x, c.y, c.z)) {
          this.world.remove(c.x, c.y, c.z);
          this.sounds?.destroy();
        }
        this.actionsInIteration++;
        await this.sleep(this.stepMs);
        break;
      }
      case 'controls_repeat_ext': {
        let n = Math.round(await this.evalValue(b.getInputTargetBlock('TIMES')));
        n = Math.max(0, Math.min(1000, n || 0));
        for (let i = 0; i < n; i++) {
          this.checkStop();
          await this.execLoopBody(b, 'DO');
        }
        break;
      }
      case 'controls_whileUntil': {
        const until = b.getFieldValue('MODE') === 'UNTIL';
        let guard = 0;
        while (true) {
          this.checkStop();
          let cond = !!(await this.evalValue(b.getInputTargetBlock('BOOL')));
          if (until) cond = !cond;
          if (!cond) break;
          if (++guard > 2000) {
            this.onStatus('Schleife nach 2000 Durchläufen angehalten (Endlosschleife?).', 'warn');
            break;
          }
          await this.execLoopBody(b, 'DO');
        }
        break;
      }
      case 'controls_if': {
        let n = 0;
        let done = false;
        while (b.getInput('IF' + n)) {
          const cond = await this.evalValue(b.getInputTargetBlock('IF' + n));
          if (cond) {
            await this.execStack(b.getInputTargetBlock('DO' + n));
            done = true;
            break;
          }
          n++;
        }
        if (!done && b.getInput('ELSE')) {
          await this.execStack(b.getInputTargetBlock('ELSE'));
        }
        break;
      }
      case 'variables_set': {
        const id = b.getField('VAR').getVariable().getId();
        this.vars.set(id, await this.evalValue(b.getInputTargetBlock('VALUE')));
        await this.sleep(60);
        break;
      }
      case 'math_change': {
        const id = b.getField('VAR').getVariable().getId();
        const delta = await this.evalValue(b.getInputTargetBlock('DELTA'));
        this.vars.set(id, (Number(this.vars.get(id)) || 0) + delta);
        await this.sleep(60);
        break;
      }
      case 'procedures_defnoreturn':
      case 'procedures_defreturn':
        break; // Definitionen laufen nur über Aufrufe
      case 'procedures_callnoreturn': {
        await this.callProcedure(b);
        break;
      }
      case 'procedures_ifreturn': {
        const cond = await this.evalValue(b.getInputTargetBlock('CONDITION'));
        if (cond) {
          const val = b.getInput('VALUE') ? await this.evalValue(b.getInputTargetBlock('VALUE')) : undefined;
          throw new ReturnSignal(val);
        }
        break;
      }
      default:
        // Unbekannter Baustein: überspringen, aber melden
        this.onStatus(`Baustein »${b.type}« wird übersprungen.`, 'warn');
    }
  }

  // Schleifenkörper mit Schutz: Runden ohne sichtbare Aktion bremsen kurz,
  // damit leere Schleifen den Browser nicht einfrieren.
  async execLoopBody(b, inputName) {
    const before = this.actionsInIteration;
    await this.execStack(b.getInputTargetBlock(inputName));
    if (this.actionsInIteration === before) {
      this.highlight(b.id);
      await this.sleep(Math.max(60, this.stepMs / 4));
    }
  }

  async callProcedure(callBlock, wantReturn) {
    const name = callBlock.getFieldValue('NAME');
    const def = this.workspace.getTopBlocks(false).find(
      x => (x.type === 'procedures_defnoreturn' || x.type === 'procedures_defreturn') &&
           x.getFieldValue('NAME') === name
    );
    if (!def) throw new Error(`Funktion »${name}« nicht gefunden`);
    if (++this.callDepth > 50) throw new Error('Zu viele verschachtelte Funktionsaufrufe');
    // Argumente an Variablen binden (Blockly 13: getVarModels, ältere Versionen: getVars)
    let params = [];
    if (typeof def.getVarModels === 'function') {
      params = def.getVarModels().map(v => v.getId());
    } else if (typeof def.getVars === 'function') {
      params = def.getVars().map(n => {
        const v = this.workspace.getVariableMap().getVariable(n);
        return v ? v.getId() : null;
      });
    }
    for (let i = 0; i < params.length; i++) {
      const argVal = await this.evalValue(callBlock.getInputTargetBlock('ARG' + i));
      if (params[i]) this.vars.set(params[i], argVal);
    }
    let ret = undefined;
    try {
      await this.execStack(def.getInputTargetBlock('STACK'));
      if (def.type === 'procedures_defreturn') {
        ret = await this.evalValue(def.getInputTargetBlock('RETURN'));
      }
    } catch (e) {
      if (e instanceof ReturnSignal) ret = e.value;
      else { this.callDepth--; throw e; }
    }
    this.callDepth--;
    return ret;
  }

  async evalValue(b) {
    if (!b) return 0;
    this.checkStop();
    switch (b.type) {
      case 'math_number':
        return Number(b.getFieldValue('NUM')) || 0;
      case 'math_arithmetic': {
        const a = await this.evalValue(b.getInputTargetBlock('A'));
        const c = await this.evalValue(b.getInputTargetBlock('B'));
        switch (b.getFieldValue('OP')) {
          case 'ADD': return a + c;
          case 'MINUS': return a - c;
          case 'MULTIPLY': return a * c;
          case 'DIVIDE': return c === 0 ? 0 : a / c;
          case 'POWER': return Math.pow(a, c);
        }
        return 0;
      }
      case 'logic_boolean':
        return b.getFieldValue('BOOL') === 'TRUE';
      case 'logic_negate':
        return !(await this.evalValue(b.getInputTargetBlock('BOOL')));
      case 'logic_compare': {
        const a = await this.evalValue(b.getInputTargetBlock('A'));
        const c = await this.evalValue(b.getInputTargetBlock('B'));
        switch (b.getFieldValue('OP')) {
          case 'EQ': return a === c;
          case 'NEQ': return a !== c;
          case 'LT': return a < c;
          case 'LTE': return a <= c;
          case 'GT': return a > c;
          case 'GTE': return a >= c;
        }
        return false;
      }
      case 'logic_operation': {
        const op = b.getFieldValue('OP');
        const a = !!(await this.evalValue(b.getInputTargetBlock('A')));
        if (op === 'AND' && !a) return false;
        if (op === 'OR' && a) return true;
        return !!(await this.evalValue(b.getInputTargetBlock('B')));
      }
      case 'agent_erkennt': {
        const map = { VORNE: 'vorne', UNTEN: 'unten', LINKS: 'links', RECHTS: 'rechts' };
        const c = this.agent.cellInDir(map[b.getFieldValue('WO')]);
        // Kurz aufblinken lassen, damit man sieht, dass der Agent "schaut"
        return !!(c && this.world.has(c.x, c.y, c.z));
      }
      case 'variables_get': {
        const id = b.getField('VAR').getVariable().getId();
        return this.vars.get(id) ?? 0;
      }
      case 'procedures_callreturn':
        return await this.callProcedure(b, true);
      default:
        this.onStatus(`Wert-Baustein »${b.type}« unbekannt — nehme 0.`, 'warn');
        return 0;
    }
  }

  checkGold() {
    if (this.goldFound) return;
    const unten = this.agent.cellInDir('unten');
    const vorne = this.agent.cellInDir('vorne');
    const g = c => c && this.world.get(c.x, c.y, c.z) === 'gold';
    if (g(unten) || g(vorne)) {
      this.goldFound = true;
      this.sounds?.success();
      this.onStatus('🏆 Geschafft! Der Agent hat den Goldblock erreicht!', 'success');
    }
  }
}
