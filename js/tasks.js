// Die 12 Aufgaben (+ Aufgabe 0) — angepasst an MidCraft Studio:
// kein Inventar (Agent hat unbegrenzt Material), Teleport zum Start statt "zu mir".
'use strict';

const TASK_GROUPS = [
  {
    title: 'Zum Start',
    tasks: [
      {
        title: 'Aufgabe 0 — „Komm her!"',
        cmd: 'komm',
        text: 'Der Rettungsbefehl für den ganzen Tag: Bau ein Programm mit dem Startblock ' +
          '<b>⚡ wenn Befehl „komm"</b> und dem Baustein <b>Agent teleportiere zum Start</b>. ' +
          'Test: Lass den Agenten ein Stück weglaufen, tipp dann <b>komm</b> ins Befehlsfeld — er steht sofort wieder am Start.',
        tip: 'Ab jetzt gibt es kein „mein Agent ist weg" mehr. Egal was schiefgeht: komm tippen, von vorn.',
      },
    ],
  },
  {
    title: 'Block 1 — Sequenzen',
    tasks: [
      {
        title: 'Stufe 1 — „Der Weg"',
        cmd: 'weg',
        text: 'Setz mit der Maus einen <b>Goldblock</b> als Ziel: 3 Schritte vor deinem Agenten, dann 2 Schritte links (aus Agentensicht!). ' +
          'Schreib ein Programm, das ihn genau dorthin laufen lässt — mit einem einzigen Befehl.',
        tip: 'Der Agent denkt aus SEINER Sicht — sein links ist nicht dein links. Dreh die Kamera hinter den Agenten!',
      },
      {
        title: 'Stufe 2 — „Die Brücke"',
        cmd: 'bruecke',
        text: 'Grab mit der Maus einen Graben: 4 Blöcke breit, 2 tief, quer vor deinem Agenten (Rechtsklick entfernt Blöcke). ' +
          'Dein Agent schwebt — er fällt nicht rein! Lass ihn über den Graben laufen und dabei den Boden unter sich bauen: ' +
          '<b>bewege vorwärts um 1</b>, dann <b>platziere unten</b> — und das viermal untereinander. Noch ohne Trick!',
        tip: 'Reihenfolge ist die halbe Aufgabe: Erst der Schritt auf die Lücke, DANN bauen. Andersrum fehlt am Ende ein Stück Brücke — probier es aus!',
      },
      {
        title: 'Stufe 3 — „Die Mauer"',
        cmd: 'mauer',
        text: 'Bau eine Mauer: 3 Blöcke breit, 3 hoch. Immer noch ohne Trick — jeder Befehl einzeln. ' +
          'Muster für EINE Säule: <b>platziere vorne · hoch 1 · platziere vorne · hoch 1 · platziere vorne · runter 3 · drehe rechts · vorwärts 1 · drehe links</b>. Und das dreimal. ' +
          'Ja, das ist viel Tipperei — genau darum geht es!',
        tip: 'Bau erst EINE Säule, die sauber klappt. Und: Nach der Säule runterfliegen — sonst baut der Agent die nächste Säule in der Luft.',
      },
      {
        title: 'Bonus — „Pixel-Kunst"',
        cmd: 'kunst',
        text: 'Der Agent kann den Boden umfärben: <b>zerstöre unten</b> + <b>platziere unten (Wolle)</b> tauscht den Block unter ihm aus. ' +
          'Programmier ihn so, dass er deinen Anfangsbuchstaben in den Boden malt.',
        tip: 'Zeichne deinen Buchstaben auf Papier und zerleg ihn in gerade Strecken. Pro Strecke: malen + laufen im Wechsel.',
      },
    ],
  },
  {
    title: 'Block 2 — Schleifen',
    tasks: [
      {
        title: 'Stufe 1 — „Nochmal, aber schlau"',
        cmd: 'bruecke2',
        text: 'Bau deine Brücke neu — diesmal mit dem <b>wiederhole</b>-Block: ' +
          '<b>wiederhole 4 mal: bewege vorwärts 1 + platziere unten</b>. Aus 8 Bausteinen werden 3! ' +
          'Danach: Ändere die 4 auf 20 — dein Agent baut eine Monsterbrücke quer durch die Welt.',
        tip: 'Stecken deine zwei Befehle wirklich IM wiederhole-Block drin? Zieh sie mal ganz raus und wieder rein.',
      },
      {
        title: 'Stufe 2 — „Turm & Treppe"',
        cmd: 'turm · treppe',
        text: 'Zwei Bauwerke, beide mit je einer Schleife. <b>Turm:</b> wiederhole 5 mal (bewege hoch 1 + platziere unten). ' +
          '<b>Treppe:</b> wiederhole 5 mal (platziere vorne + bewege hoch 1 + bewege vorwärts 1). Foto mit beiden zusammen!',
        tip: 'Beim Turm: Kann der Agent unter sich bauen, solange er noch auf dem Boden schwebt? Erst steigen, dann bauen!',
      },
      {
        title: 'Stufe 3 — „Die große Mauer"',
        cmd: 'supermauer',
        text: 'Die Mauer aus Block 1 — aber jetzt <b>5 breit und 3 hoch</b>, mit einer Schleife IN einer Schleife. ' +
          'Innen: eine Säule (wiederhole 3 mal: platziere vorne + hoch 1). ' +
          'Außen: fünfmal „Säule + runter 3 + drehe rechts + vorwärts 1 + drehe links".',
        tip: 'Baut dein Agent eine Diagonale? Dann steckt der Seitwärts-Schritt in der FALSCHEN Schleife.',
      },
      {
        title: 'Bonus — „Die Pyramide"',
        cmd: 'pyramide',
        text: 'Bau eine Pyramide: Jede Ebene ist kleiner als die darunter. Das geht mit Schleifen allein — ' +
          'oder eleganter mit einer <b>Variablen</b> für die Breite, die pro Ebene um 2 schrumpft (Kategorie „Variablen").',
        tip: 'Eine Variable ist ein Merkzettel mit einer Zahl: breite = 7, nach jeder Ebene breite = breite − 2.',
      },
    ],
  },
  {
    title: 'Block 3 — Bedingungen',
    tasks: [
      {
        title: 'Stufe 1 — „Der Not-Stopp"',
        cmd: 'lauf',
        text: 'Bau mit der Maus eine Wand, etwa 10 Schritte vor deinem Agenten (mindestens 3 breit!). ' +
          'Programm: <b>wiederhole solange nicht (Agent erkennt Block vorne): bewege vorwärts 1</b>. ' +
          'Der Agent läuft los und stoppt von selbst vor der Wand.',
        tip: 'Läuft dein Agent an der Wand vorbei? Dann steht die Wand nicht in SEINER Laufrichtung.',
      },
      {
        title: 'Stufe 2 — „Der Kletterer"',
        cmd: 'spring',
        text: 'Bau einen Hindernislauf: 3 einzelne Blöcke mit Abstand in einer Linie. ' +
          'Programm: <b>wiederhole 12 mal: wenn (erkennt Block vorne) dann (hoch 1 · vorwärts 2 · runter 1) ansonsten (vorwärts 1)</b>. ' +
          'Der Agent springt von selbst über jede Hürde!',
        tip: 'Das ansonsten nicht vergessen — sonst läuft der Agent zwischen den Hürden nicht weiter.',
      },
      {
        title: 'Stufe 3 — „Der Brückenbauer"',
        cmd: 'bau',
        text: 'Die Königsdisziplin: Grab 2–3 Gräben in eine Laufstrecke. ' +
          'Programm: <b>wiederhole 12 mal: bewege vorwärts 1 · wenn nicht (erkennt Block unten) dann platziere unten</b>. ' +
          'Der Agent baut sich seinen Weg selbst — aber nur da, wo einer fehlt.',
        tip: 'Der Agent fällt nicht — er schwebt über der Lücke. Er kann also erst hinlaufen und DANN nach unten schauen.',
      },
      {
        title: 'Bonus — „Das Labyrinth"',
        cmd: 'labyrinth',
        text: 'Bau ein kleines Labyrinth aus Wänden (ca. 7×7). Der Agent findet allein den Weg — mit der <b>Rechte-Hand-Regel</b>: ' +
          'wiederhole oft: wenn rechts frei → drehe rechts + geh 1, sonst wenn vorne frei → geh 1, sonst → drehe links.',
        tip: '„Rechts frei" heißt: NICHT (Agent erkennt Block rechts). Prüfreihenfolge ist alles: erst rechts, dann geradeaus, dann drehen.',
      },
    ],
  },
];
