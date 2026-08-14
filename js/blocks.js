// Deutsche Blockly-Blöcke für den Agenten + Toolbox.
'use strict';

(function defineBlocks() {
  const materialOptions = MATERIAL_ORDER.map(id => [MATERIALS[id].name, id]);

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'ereignis_chat',
      message0: '⚡ wenn Befehl %1 eingegeben wird',
      args0: [{ type: 'field_input', name: 'BEFEHL', text: 'los' }],
      nextStatement: null,
      colour: 40,
      tooltip: 'Startet das Programm, wenn du diesen Befehl unten in das Befehlsfeld tippst.',
    },
    {
      type: 'agent_bewege',
      message0: 'Agent bewege %1 um %2',
      args0: [
        {
          type: 'field_dropdown', name: 'RICHTUNG',
          options: [['vorwärts', 'VOR'], ['rückwärts', 'ZURUECK'], ['hoch', 'HOCH'], ['runter', 'RUNTER']],
        },
        { type: 'input_value', name: 'ANZAHL', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: 'Bewegt den Agenten Schritt für Schritt. Er kann nicht durch Blöcke laufen.',
    },
    {
      type: 'agent_drehe',
      message0: 'Agent drehe %1',
      args0: [{
        type: 'field_dropdown', name: 'DREHUNG',
        options: [['links', 'LINKS'], ['rechts', 'RECHTS']],
      }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: 'Dreht den Agenten um 90 Grad. Links und rechts aus SEINER Sicht!',
    },
    {
      type: 'agent_teleport',
      message0: 'Agent teleportiere zum Start',
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: 'Holt den Agenten sofort zum Startpunkt zurück.',
    },
    {
      type: 'agent_platziere',
      message0: 'Agent platziere %1 %2',
      args0: [
        {
          type: 'field_dropdown', name: 'WO',
          options: [['vorne', 'VORNE'], ['unten', 'UNTEN']],
        },
        { type: 'field_dropdown', name: 'MATERIAL', options: materialOptions },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: 'Setzt einen Block vor oder unter den Agenten. Der Agent hat unbegrenzt Material.',
    },
    {
      type: 'agent_zerstoere',
      message0: 'Agent zerstöre %1',
      args0: [{
        type: 'field_dropdown', name: 'WO',
        options: [['vorne', 'VORNE'], ['unten', 'UNTEN']],
      }],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: 'Entfernt den Block vor oder unter dem Agenten.',
    },
    {
      type: 'agent_erkennt',
      message0: 'Agent erkennt Block %1',
      args0: [{
        type: 'field_dropdown', name: 'WO',
        options: [['vorne', 'VORNE'], ['unten', 'UNTEN'], ['links', 'LINKS'], ['rechts', 'RECHTS']],
      }],
      output: 'Boolean',
      colour: 290,
      tooltip: 'Wahr, wenn dort ein Block ist — sonst falsch. Aus Sicht des Agenten!',
    },
  ]);

  window.MIDCRAFT_TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category', name: 'Start', colour: '40',
        contents: [{ kind: 'block', type: 'ereignis_chat' }],
      },
      {
        kind: 'category', name: 'Bewegung', colour: '210',
        contents: [
          {
            kind: 'block', type: 'agent_bewege',
            inputs: { ANZAHL: { shadow: { type: 'math_number', fields: { NUM: 1 } } } },
          },
          { kind: 'block', type: 'agent_drehe' },
          { kind: 'block', type: 'agent_teleport' },
        ],
      },
      {
        kind: 'category', name: 'Bauen', colour: '20',
        contents: [
          { kind: 'block', type: 'agent_platziere' },
          { kind: 'block', type: 'agent_zerstoere' },
        ],
      },
      {
        kind: 'category', name: 'Sensor', colour: '290',
        contents: [{ kind: 'block', type: 'agent_erkennt' }],
      },
      {
        kind: 'category', name: 'Logik', colour: '120',
        contents: [
          {
            kind: 'block', type: 'controls_repeat_ext',
            inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } } },
          },
          { kind: 'block', type: 'controls_whileUntil' },
          { kind: 'block', type: 'controls_if' },
          {
            kind: 'block', type: 'controls_if',
            extraState: { hasElse: true },
          },
          { kind: 'block', type: 'logic_negate' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
          { kind: 'block', type: 'logic_boolean' },
        ],
      },
      {
        kind: 'category', name: 'Mathe', colour: '230',
        contents: [
          { kind: 'block', type: 'math_number', fields: { NUM: 1 } },
          {
            kind: 'block', type: 'math_arithmetic',
            inputs: {
              A: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
              B: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
            },
          },
        ],
      },
      { kind: 'sep' },
      { kind: 'category', name: 'Variablen', custom: 'VARIABLE', colour: '330' },
      { kind: 'category', name: 'Funktionen', custom: 'PROCEDURE', colour: '290' },
    ],
  };
})();
