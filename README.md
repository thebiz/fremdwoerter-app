# Fremdwörter

Eigene App zum Sammeln und Lernen von Fremdwörtern.

- Jeder Push auf `main` baut über GitHub Actions eine APK und veröffentlicht sie als Release.
- Die App sucht unter „Mehr → Nach Update suchen“ selbst nach neuen Versionen (Repo `thebiz/fremdwoerter-app`, muss öffentlich sein).
- Startdaten: `app/src/main/assets/woerter.json` (334 Wörter aus der Google-Tabelle).
