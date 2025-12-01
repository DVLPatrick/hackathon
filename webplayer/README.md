# Google AI Studio Webplayer

Eine Web-Plattform zum direkten Ausprobieren von aus Google AI Studio exportierten ZIP-Dateien.

## Features

- 📤 **Drag & Drop Upload**: Einfaches Hochladen von ZIP-Dateien per Drag & Drop oder Klick
- 📦 **Automatische Extraktion**: ZIP-Dateien werden automatisch entpackt und analysiert
- 🎮 **Webplayer**: Direkte Ausführung der exportierten Anwendungen im Browser
- 📁 **Datei-Explorer**: Übersicht über alle enthaltenen Dateien
- 🎨 **Moderne UI**: Benutzerfreundliche Oberfläche mit responsivem Design

## Verwendung

### Option 1: Direktes Hochladen
1. Öffne `index.html` in einem modernen Webbrowser
2. Lade eine ZIP-Datei hoch, die aus Google AI Studio exportiert wurde
3. Die Anwendung wird automatisch extrahiert und im Webplayer angezeigt

### Option 2: GitHub Repository kompilieren
1. Öffne `index.html` in einem modernen Webbrowser
2. Klicke auf den Tab **🐙 GitHub kompilieren**
3. Gib eine GitHub Repository URL ein
4. Die Plattform lädt die ZIP-Datei herunter und zeigt sie an

**Hinweis:** Für automatische Kompilierung von TypeScript-Projekten, siehe [GITHUB_SETUP.md](GITHUB_SETUP.md)

## Technische Details

Die Plattform verwendet:
- **JSZip**: Zum Entpacken von ZIP-Dateien im Browser
- **Blob URLs**: Zum Anzeigen der extrahierten HTML-Dateien
- **Iframe Sandbox**: Für sichere Ausführung der Anwendungen

## Unterstützte Formate

- HTML/CSS/JavaScript Anwendungen
- Statische Webanwendungen
- **Kompilierte** React, Angular, Vue Projekte (aus `dist/`, `build/`, etc.)

## Wichtiger Hinweis zu TypeScript/TSX

**TypeScript und TSX-Dateien können nicht direkt im Browser ausgeführt werden!**

Wenn dein Google AI Studio Export TypeScript/TSX-Dateien enthält:
1. **Option 1**: Kompiliere das Projekt zuerst mit `npm run build`
2. **Option 2**: Verwende die bereits kompilierten Dateien aus dem `dist/` oder `build/` Ordner
3. Die Plattform sucht automatisch nach kompilierten Dateien in Build-Ordnern

Die Plattform erkennt automatisch, ob ein Projekt kompilierte Dateien enthält und zeigt eine entsprechende Fehlermeldung, falls nicht.

## Browser-Kompatibilität

- Chrome/Edge (empfohlen)
- Firefox
- Safari

## GitHub Actions Integration

Für TypeScript/TSX-Projekte kannst du GitHub Actions verwenden, um automatisch zu kompilieren:

1. Kopiere `.github/workflows/build-project.yml` in dein Repository
2. Führe den Workflow manuell aus (siehe [GITHUB_SETUP.md](GITHUB_SETUP.md))
3. Die kompilierte Version wird als Release erstellt

## Hinweise

- Die Anwendung läuft vollständig clientseitig im Browser
- Keine Server-Kommunikation erforderlich (außer GitHub-Downloads)
- Alle Daten bleiben lokal auf deinem Gerät
- GitHub-Integration lädt ZIP-Dateien direkt von GitHub herunter

