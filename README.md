# 🤖 MidCraft Studio

Eine kostenlose, browserbasierte Lernumgebung im Stil von Minecraft Education:
links eine 3D-Klötzchenwelt, rechts ein Blockly-Editor mit deutschen Blöcken.
Die Teilnehmenden programmieren einen schwebenden Roboter-Agenten, der sich
bewegt, baut und seine Umgebung wahrnimmt.

Gebaut für den Online-Programmierkurs am 26.08.2026 (11 Jugendliche, Klasse 7–11).
Alle 12 Aufgaben aus `../MidCraft_Uebungen_12_Aufgaben.md` sind mit dem
enthaltenen Blockset lösbar und wurden automatisiert durchgetestet.

## Lokal starten

**Am einfachsten:** Doppelklick auf `index.html` — die App läuft komplett ohne
Server, ohne Internet, ohne Installation (alle Bibliotheken liegen in `vendor/`).

Alternativ mit lokalem Server (identisches Verhalten):

```bash
cd midcraft-studio && python3 -m http.server 8642
```

Dann im Browser: http://localhost:8642 — aktueller Chrome oder Edge empfohlen.

## Deploy als GitHub Pages

1. Leeres GitHub-Repository anlegen (z. B. `midcraft-studio`) — ohne README
2. Deploy-Skript ausführen:

```bash
cd midcraft-studio && ./deploy.sh https://github.com/DEIN-NAME/midcraft-studio.git
```

3. Auf GitHub: **Settings → Pages → Source: „Deploy from a branch"**, Branch
   `main`, Ordner `/ (root)` → Save
4. Nach ~1 Minute ist die App unter `https://DEIN-NAME.github.io/midcraft-studio/`
   erreichbar — diese URL in die Zoom-Einladung und in die Teilnehmer-Anleitung

Alternativ Netlify: den Ordner `midcraft-studio` einfach auf
https://app.netlify.com/drop ziehen — fertig.

Alle Pfade sind relativ, `.nojekyll` liegt bei — die App funktioniert damit
sowohl unter einer Unterseite (`/midcraft-studio/`) als auch offline per
Doppelklick.

## Kursunterlagen (im übergeordneten Ordner)

- `ANLEITUNG_Teilnehmer.md` — Ein-Seiter für die Jugendlichen: URL eintragen,
  ausdrucken oder als PDF an die Eltern schicken
- `TRAINER_Notfallplan.md` — Checkliste vor dem Kurs, die 8 häufigsten
  Live-Probleme mit Ein-Satz-Antwort, Eskalationsstufen, Zeitplan mit Puffer
- `MidCraft_Uebungen_12_Aufgaben.md` — die didaktische Grundlage mit allen Lösungen

## Bedienung

| Aktion | Wie |
|---|---|
| Kamera drehen | Linke Maustaste ziehen |
| Zoomen | Mausrad |
| Verschieben | Rechte Maustaste ziehen |
| Block setzen | Klick (Baustoff unten in der Hotbar wählen, Tasten 1–8) |
| Block entfernen | Rechtsklick oder Shift+Klick |
| 🎮 Spielmodus | Ego-Ansicht wie im Klötzchen-Spiel: WASD = laufen, Maus = umsehen, Leertaste/Umschalt = hoch/runter, **Linksklick = abbauen, Rechtsklick = bauen**, Esc = zurück |
| Programm starten | Befehl ins 💬-Feld tippen (z. B. `komm`) oder ▶ Ausführen |
| Programm stoppen | ⏹ Stopp |
| Tempo | 🐢/🐇-Regler |
| Screenshot | 📸 Foto → PNG-Download (für den Zoom-Chat) |
| Speichern/Mitnehmen | 💾 Mitnehmen → JSON-Datei · 📂 Öffnen lädt sie wieder |
| Aufgaben | 📋 Aufgaben → einklappbares Panel mit allen 12 Aufgaben |
| Hilfe | ❓ Hilfe → Erste-Hilfe-Panel mit den 8 häufigsten Problemen (fängt Zoom-Chat-Fragen ab) |

Die Welt und alle Programme werden zusätzlich automatisch im Browser
gespeichert (localStorage) — nach einem Neuladen geht nichts verloren.
Keine Accounts, keine Cookies, keine Datenübertragung.

## Blockset (deutsch)

- **Start:** ⚡ „wenn Befehl […] eingegeben wird"
- **Bewegung:** „Agent bewege [vorwärts/rückwärts/hoch/runter] um [n]",
  „Agent drehe [links/rechts]", „Agent teleportiere zum Start"
- **Bauen:** „Agent platziere [vorne/unten] [Material]", „Agent zerstöre [vorne/unten]"
- **Sensor:** „Agent erkennt Block [vorne/unten/links/rechts]" → wahr/falsch
- **Logik:** wiederhole n mal · wiederhole solange/bis · wenn/dann/ansonsten ·
  nicht · Vergleiche · und/oder
- **Mathe, Variablen, Funktionen:** für die Bonusaufgaben (Pyramide) und
  die Differenzierung Klasse 10/11

### Spielregeln des Agenten

- Der Agent **schwebt** — er fällt nie. Er startet neben der orangen Fahne.
- Er kann **nicht durch Blöcke** laufen: Ist die Zielzelle belegt, bleibt er
  stehen (kurzer „Rempler").
- Er hat **unbegrenzt Material** — das Material wird am Platzier-Block gewählt.
  Inventarverwaltung gibt es bewusst nicht.
- „platziere vorne" baut auf seiner Höhe vor ihm, „platziere unten" direkt
  unter ihm. In belegte Zellen wird nicht gebaut (kein Fehler, nur ein Ton).
- Erreicht der Agent einen **Goldblock** (direkt vor oder unter ihm), gibt es
  ein „🏆 Geschafft!".

## Referenzlösungen

`loesungen-referenz.json` enthält alle 14 Musterprogramme (`komm`, `weg`,
`bruecke`, `mauer`, `kunst`, `mauer2`, `turm`, `treppe`, `supermauer`,
`pyramide`, `lauf`, `spring`, `bau`, `labyrinth`) mit frischer Welt.
In der App über **📂 Öffnen** laden — z. B. um für das Teilnehmer-PDF
Screenshots der echten Blöcke zu machen. **Achtung:** Vor dem Kurs nicht an
die Teilnehmenden geben, es sind die Lösungen. 😉

## Technik

- [Three.js](https://threejs.org/) r147 (WebGL) für die Voxelwelt —
  InstancedMesh pro Material, Welt 40×40×12, selbst gezeichnete
  16×16-Pixel-Art-Texturen pro Blockseite (Grasrand, Holzbretter, …) —
  keine fremden Assets, kein Minecraft-Branding
- Ego-Modus („Spielmodus") mit PointerLock: Fadenkreuz-Bauen wie im
  Vorbild (links abbauen, rechts platzieren), Flug-Steuerung ohne Physik.
  Hinweis: braucht einen echten Browser-Tab mit Fokus — in eingebetteten
  Vorschauen verweigert der Browser den Maus-Fang (App zeigt dann einen Hinweis)
- [Google Blockly](https://developers.google.com/blockly) 13.2 mit deutscher
  Lokalisierung, Zelos-Renderer (große, kinderfreundliche Blöcke)
- Eigener Baum-Interpreter für die Blockausführung: animiert Schritt für
  Schritt, hebt den laufenden Block hervor, jederzeit stoppbar,
  Endlosschleifen-Schutz (max. 2000 Durchläufe)
- Kein Build-Schritt, keine Abhängigkeiten zur Laufzeit, 100 % statisch

### Dateien

```
index.html            Einstieg + Layout
css/style.css         komplette Optik
js/materials.js       die 8 Baustoffe
js/world.js           Voxelwelt: Daten, Rendering, Raycasting, Texturen
js/agent.js           Roboter: Mesh, Bewegung, Animationen
js/blocks.js          Blockly-Blockdefinitionen + Toolbox (deutsch)
js/interpreter.js     Programmausführung (Baum-Interpreter)
js/tasks.js           die 12 Aufgaben fürs Aufgabenpanel
js/storage.js         Autosave (localStorage) + Export/Import
js/main.js            Verdrahtung: Szene, Maus-Bauen, UI
vendor/               Three.js + Blockly (lokal, offlinefähig)
```

## Lizenzhinweise

Three.js (MIT) und Blockly (Apache 2.0) liegen unverändert in `vendor/`.
Alle übrigen Dateien: eigener Code für den Kurs. Keine Mojang/Microsoft-Assets.
