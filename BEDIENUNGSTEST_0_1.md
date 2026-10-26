# MindSpeak Connect – Bedienungstest 0.1

**Stand:** 26.10.2026 · passend zur Web-Demo **0.4**.  
**Zweck:** Die reine Kommunikationsoberfläche kontrolliert testen. **Keine EEG-Steuerung, kein medizinischer Wirksamkeitsnachweis.** Keine Verwendung als Notrufsystem oder einzige Kommunikationsmöglichkeit.

## Forschungs- und Praxisfrage

Kann eine Person die beabsichtigte Aussage unter verschiedenen Eingabebedingungen zuverlässig, verständlich und ohne hohe Belastung auswählen? Verglichen werden **direktes Tippen** und **automatischer Ein-Tasten-Scan** – nicht EEG-Genauigkeit.

## Für erste freiwillige Funktionstests

1. Die [Demo](https://summerervivian2001-oss.github.io/-mindspeak-connect-demo/) in Chrome öffnen. Vorher darauf achten, dass die Umgebung ruhig ist und genügend Zeit zur Verfügung steht.
2. Im Bereich **Bedienung prüfen** auf *Test starten* tippen. Die App mischt 12 Aufgaben: Jede der vier Aussagen ist genau dreimal Ziel. **Erster Durchgang nur durch direktes Tippen** auf die großen Tasten. Die Stoppuhr startet für jede Aufgabe mit der Anzeige des Auftrags.
3. Nach dem Durchgang Treffer, abgelaufene Scan-Umläufe und Median der tatsächlichen Auswahlzeiten notieren. **Optional** das anonyme CSV auf dem eigenen Gerät speichern.
4. Einen **zweiten, getrennten Durchgang** durchführen. Ausschließlich *Scan starten* und dann *Markiertes Feld wählen* oder eine als Leertaste erkannte Hardwaretaste verwenden. Scangeschwindigkeit und Umlauflimit vorher festlegen und unverändert lassen. Direkte Auswahl während des Scan-Vergleichs vermeiden; die CSV markiert die tatsächliche Eingabeart.
5. Subjektiv festhalten: Verständlichkeit der Felder, als zu langsam oder schnell empfundener Scan, versehentliche Auswahlen, Ermüdung, Bedarf nach Pause und Probleme mit tatsächlicher Hardware. Bei Ermüdung/Frust jederzeit abbrechen.

## Messgrößen und Auswertung

| Messgröße | Interpretation |
|---|---|
| Richtige Auswahlen / 12 | Beschreibende Erfolgsquote für diese Sitzung, keine klinische Dekodiergüte |
| Scans ohne Auswahl | Fehlende Reaktion trotz durchgelaufener Scan-Zyklen; separat von Falschauswahl |
| Median Auswahlzeit | Nur Aufgaben mit tatsächlicher Auswahl; ein zusätzlicher Vergleich der gesamten Aufgabenerfolgsrate verhindert verzerrt gute Zeiten durch ausgelassene Aufgaben |
| Tatsächliche Eingabeart | CSV unterscheidet Touch, Tastatur, Scan-Bildschirmtaste und Scan-Tastatur |
| Irrtümer, Verständlichkeit, Ermüdung | Ergänzende Beobachtungen; nicht in der CSV enthalten |

Die Oberfläche speichert Ergebnisse nur bis zum Neuladen im Browser. Durch einen aktiven Klick auf **Ergebnis als CSV speichern** kann eine lokale Datei ohne Namen oder Kontaktdaten erstellt werden. Schon Bedienungsleistungen können bei einer Weitergabe sensibel sein: keine Daten Dritter ohne Aufklärung und Einwilligung sammeln oder öffentlich hochladen.

## Verbindliche Produktgrenzen

- Der Test darf weder fälschlich die vier Antworten automatisch vorlesen noch Ergebnisse in den normalen Kommunikationsverlauf übertragen.
- Ein Scan soll ohne explizite Auswahl niemals eine Aussage absenden.
- **„Bitte helfen“ ist nur eine lokale Aussage und alarmiert niemanden.**
- Systemstimme und Stimmeinstellungen sind nachrangig; hochwertige Stimme und Sprachvielfalt stehen separat auf der Produkt-Merkliste.
- Verfügbare Web-Speech-Stimmen und externe Taster sind geräteabhängig und noch nicht mit der Zielgruppe validiert.

## Nächste Forschungsstufen (getrennte Gates)

**Gate A – technische Zugänglichkeit:** Beobachtung, Wiederholung und Fehleranalysen bei unterschiedlichen Geräten, Schriftgrößen und Eingabehilfen; anschließend möglichst mit betroffenen Nutzer:innen und unterstützenden Fachpersonen. Keine unrealistischen Schlüsse aus Tests nur mit gesunden Personen ziehen.

**Gate B – EEG-Steuerung:** Für ein tatsächliches Ja/Nein-Signal sind neue, zur Kommunikation passende EEG-Aufgaben und ein Nicht-Auswahl-/Ruhezustand nötig. PhysioNet-Motor-Imagery-Klassifikation von linker und rechter Faust allein reicht nicht. Falschauslösungen pro Zeit, Reaktionslatenz, Kalibrieraufwand, Pausen, EEG-Artefakte und Generalisierung zu neuen Personen müssen vor einer Integration evaluiert werden.

**Gate C – Nutzen im Alltag:** Nur wenn technische Zuverlässigkeit und sicherheitsrelevante Kontrollen nachgewiesen sind: nutzerzentrierte Vergleiche mit bestehenden Hilfsmitteln (Taster, Scanning, Augensteuerung), Verständlichkeit für Kommunikationspartner und Belastung über längere Zeit.

**Wichtig:** Bisherige selbst durchgeführte Browsertests sind reine Softwaretests. Sie sind keine klinische oder nutzerzentrierte Validierung.
