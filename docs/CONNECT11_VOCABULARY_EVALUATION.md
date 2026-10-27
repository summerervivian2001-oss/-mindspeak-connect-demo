# MindSpeak Connect 1.1 – Miniwörterbuch-Erweiterung und fairerer Bedientest

**Stand:** 27.10.2026. **Status:** explorative Touch-/Ein-Tasten-Scan-Simulation, **kein EEG**, kein realer Kommunikationsnachweis. Ausgangsprojekt 0.9 und 1.0 werden nicht überschrieben.

## Motivation

Im Android-Einzeltest von MindSpeak 1.0 (N=1, drei neue Satzpaare) betrug der Zeitvorteil beim Satz „BITTE TÜR ÖFFNEN“ nur **14,6 %**, deutlich geringer als bei häufigen Wörterbuchbegriffen. Dadurch entstand die Entscheidung, alltags- und pflegerelevante Ausdrücke aufzunehmen. Die Entscheidung erfolgte **nach Sichtung** der früheren Ergebnisse (nicht vorregistriert).

## Wörterbuch-Update

- 1.1 ergänzt die bisherige lokale, regelbasierte v0.8-Vorhersage um u. a.: **MEDIKAMENTE**, MEDIKAMENT, TABLETTE, TABLETTEN, **FENSTER**, **TÜR**, **ÖFFNEN**, DECKE, KOPF, ARZT, ÄRZTIN, ÜBEL, ATMEN, SCHLUCKEN, AUFSTEHEN und HINLEGEN.
- Für einzelne Kontexte wurden Reihenfolgen bewusst angepasst: `BRAUCHE → MEDIKAMENTE`; `BITTE → FENSTER/ÖFFNEN/TÜR`; `FENSTER/TÜR → ÖFFNEN`.
- **Kein** Sprachmodell oder Gedankenlesegerät; nur fest einprogrammierte Wortliste und deterministischer Präfixabgleich, lokal im Browser.
- Vorschläge werden **niemals ohne explizite Auswahl** als Nachricht ausgegeben, gesprochen oder gesendet. Der Wörterbuchcode führt keine Netzwerkzugriffe aus.

## Versionsvergleich – nicht mit „keine Vorschläge“ verwechseln

Die neue HTML-Testseite `mindspeak-vocabulary-1.1.html` verwendet **dieselbe Ein-Tasten-Scanoberfläche** mit zwei Wörterbuchständen:
- **ALT:** Unveränderte lokale Vorhersagelogik und Begriffe aus 0.8, als separate eingefrorene HTML-Einbettung.
- **NEU:** Erweiterte v1.1-Wortliste, identische Vorhersage-API und Scanlogik.

Damit ist das primäre Vergleichsziel die **inkrementelle Verbesserung durch das neue Wörterbuch**, nicht die generelle Wirkung beliebiger Wortvorschläge gegenüber Buchstabieren.

Drei neue Sätze, je beide Zustände mit fester wechselnder Reihenfolge:
1. **ICH BRAUCHE MEDIKAMENTE** – alt, neu; neue pflegerelevante Vokabel.
2. **BITTE FENSTER ÖFFNEN** – neu, alt; andere Syntax mit neuen Begriffen.
3. **MEIN RÜCKEN JUCKT** – alt, neu; **RÜCKEN/JUCKT** wurden als expliziter Negativkontrollfall absichtlich noch nicht hinzugefügt, um die Grenzen eines endlichen Wortschatzes sichtbar zu machen.

Die Sätze wurden nach Kenntnis des bisherigen 1.0-Ergebnisses entworfen. Sie sind ein entwicklungsnaher Test, **kein unabhängiger Wirksamkeitsnachweis** oder repräsentativer Zufallssample. Insbesondere die ersten zwei Beispiele begünstigen absichtlich das neue Wörterbuch und belegen nur diesen engen Einsatzfall.

## Messung

Bei festgehaltenem, vor Testbeginn gewähltem Scanintervall erfasst jeder Durchgang:
- Zeit von `Test starten` bis zum vollständigen korrekten Satz;
- alle ausdrücklich gedrückten Zeilen- und Spaltenbestätigungen;
- bewusst eingefügte Wortvorschläge;
- Korrekturen über Backspace;
- separat gezählte abgebrochene Durchgänge.

Abgebrochene Durchgänge werden nicht als Erfolg gewertet; bei Appwechsel wird abgebrochen. Die Ergebnisdarstellung vergleicht **nur vollständig abgeschlossene Satzpaare**, keine extrapolierten Gesamtwerte. Alles bleibt im aktuellen Browsertab und wird beim Neuladen verworfen.

## Grenzen und nächste Schritte

- Nutzerin testet auf ihrem Android-Gerät; derzeit gibt es noch keine bestätigten Werte für 1.1.
- Nicht verblindeter N=1-Vergleich mit Trainingseffekten und möglicherweise veränderter Aufmerksamkeit. Drei Satzpaare können die allgemeine Effektivität einer Vorhersage nicht nachweisen.
- Worterweiterung allein ist keine sichere klinische Kommunikation, kein unabhängiges No-Command-Signal und kein Ersatz für Individualkalibrierung.
- EEG/P300 bleibt vollständig getrennte Forschung.
- Später: neue Sätze vorab festlegen, Reihenfolge randomisieren, verschiedene Personen, echte Assistive-Tech-Usability, reale Bedienbarkeit bei Einschränkungen und Messung von Fehlhandlungen.

**Nichtkommerzieller Forschungskontext:** Das allgemeine Demo-Wörterbuch selbst nutzt keine patientenbezogenen EEG-Daten. Etwaige EEG-Forschungsdatensätze und ihre Lizenzen müssen weiterhin separat behandelt werden.
