# Inkasso-Defense – Architekturregeln
- Trennung: lib/facts.ts lässt die KI NUR Fakten extrahieren, niemals rechtliche Wertung.
- Die juristische Wertung passiert deterministisch in lib/rule-engine.ts.
- lib/rules.ts ist die einzige, anwaltlich editierbare Regel-Datei. Keine Rechtslogik sonst im Code verstreuen.
- Alle Geldbeträge serverseitig in Cent rechnen; dem LLM nie eine Summe glauben.
- LLM-Aufrufe immer mit temperature: 0 und Structured Outputs (output_config.format).
- Jede Regeländerung braucht einen Positiv- UND einen Negativfall in golden/cases.ts.
- Die Golden-Suite ist CI-Gate: kein Merge bei rotem Test.
- Die UI ist "Orientierungshilfe", keine Rechtsberatung (RDG).
- Portal-Texte (eingeloggter B2B-Bereich: app/(portal)/*, components/portal/*, components/account/*):
  durchgängig **Sie / unpersönlich**, niemals "du/dein" – das Portal richtet sich an Kanzleien.
  Bei allen künftigen Portal-Screens beachten. (Der öffentliche Funnel in public/ ist davon unberührt.)
