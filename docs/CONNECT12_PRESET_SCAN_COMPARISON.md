# MindSpeak 1.2 – vorab festgelegtes Testprotokoll für unbekannte Wörter

**Stand:** 27.10.2026. **Status:** explorativer Ein-Tasten-Touchtest; die neue 1.2-Funktion ist technisch geprüft, aber zum Zeitpunkt dieser Planung noch nicht auf einem Android-Gerät nachgetestet.

## Ausgangsfrage

Macht die Abkürzung **`ABC →`** für reine Buchstabenreihen das Schreiben von Texten mit unbekannten Wörtern schneller als der bisherige kombinierte Reihenscan?

Die Grundlage ist das **identische Wörterbuch 1.1 in beiden Bedingungen** – verglichen wird **ausschließlich das Scanverfahren**, nicht ein neuer Wortschatz.

### Zwei Bedingungen

- **A / Kombiniert:** Beim Start sind Wortvorschläge in einer zusätzlichen ersten Reihe enthalten. `ABC →` wird nicht benutzt; unbekannte Wörter werden über die sechs folgenden Buchstabenreihen eingegeben.
- **B / Nur Buchstaben:** Vom kombinierten Scan aus wählt die Testperson zuerst die Reihe mit `ABC →` und bestätigt die Abkürzung mit ihrer regulären Auswahltaste. Danach stehen nur noch die sechs Buchstabenreihen zur Auswahl. **Die zwei für `ABC →` nötigen Bestätigungen und die Zeit dafür gehören zur Gesamtmessung.** Wiederholt keine Vorschlagsreihe bis zu `Wörter an`.

**Konstanz:** Gleiches Handy, gleicher Browser, gleiche vorab eingestellte Scanzeit und dieselbe Darstellung der Buchstabenreihen. Jede Zeile und jede Taste müssen ausdrücklich ausgewählt werden; das Scansystem darf **kein** Wort oder Kommando selbst auslösen. Keine direkte Buchstabentipp-Eingabe im gemessenen Versuch.

### Vorab festgelegte neue Sätze (noch nicht zur Wortliste hinzugefügt)

1. **MEIN ARM KRIBBELT** – kurzer Beschwerdesatz mit außerhalb des derzeitigen Wörterbuchs liegenden Wörtern
2. **ICH SEHE EINEN VOGEL** – gemischte bekannte/unbekannte Wörter
3. **ICH WÜNSCHE FRISCHE LUFT** – längerer, unvollständig abgedeckter Alltagssatz

Vor einem späteren Messlauf die drei Sätze und die Wörterbuchdatei als unveränderliche Revision fixieren. Sie wurden bereits vor einem 1.2-Praxisergebnis dokumentiert, nicht anhand späterer Eingabezeiten ausgesucht.

### Messplan

| Satz | erster Durchgang | zweiter Durchgang |
|---|---|---|
| MEIN ARM KRIBBELT | A | B |
| ICH SEHE EINEN VOGEL | B | A |
| ICH WÜNSCHE FRISCHE LUFT | A | B |

Erfassen:
- Sekunden vom Start einschließlich Scanwahl bis zur vollständigen korrekten Satzdarstellung.
- Anzahl der per einer Taste bestätigten Felder (Zeilen, Spalten, Steuerungsaktionen).
- Korrekturen (⌫), versehentliche Auswahlen und abgebrochene Versuche.
- Tatsächlich benutzten Wechsel `ABC →`; ob `Wörter an` wieder aktiviert wurde.
- Subjektive Bedienbarkeit / Übersichtlichkeit separat als qualitative Anmerkung.

Nur vollständige Satzpaare vergleichen. Nach jedem Durchgang Pause gestatten. Einmaliger AB/BA/AB-Pilot mit N=1 darf **keine** klinische oder allgemeine Wirksamkeitsbehauptung tragen.

## Sicherheits- und Versionsgrenzen

- Kompletter Scan der neuen 1.2-Datei wurde in synthetischen Browser-Tests geprüft; dies beweist nicht Barrierefreiheit auf realer Assistive-Tech-Hardware.
- Noch kein echter EEG-Adapter, keine P300-Onlinekommunikation, kein therapeutischer oder Notruf-Einsatz.
- Ursprüngliche 1.1-Datei und ihre Messergebnisse unverändert behalten; Testresultate getrennt protokollieren.
- **Nächster Schritt** vor der quantitativ instrumentierten Vergleichsoberfläche: Nutzerin prüft auf Android, ob `ABC →` und `Wörter an` allein über die vorhandene Ein-Tasten-Scansteuerung erreichbar sind und den Entwurf nicht versehentlich verändern oder vorlesen.
