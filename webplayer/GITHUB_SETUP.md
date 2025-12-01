# GitHub Actions Setup für automatische Kompilierung

Diese Anleitung zeigt, wie du GitHub Actions einrichtest, um deine Google AI Studio Exporte automatisch zu kompilieren.

## Schritt 1: Repository erstellen

1. Erstelle ein neues GitHub Repository (oder verwende ein bestehendes)
2. Lade deine ZIP-Datei in das Repository hoch

## Schritt 2: GitHub Actions aktivieren

1. Gehe zu deinem Repository auf GitHub
2. Klicke auf **Actions** Tab
3. Klicke auf **New workflow**
4. Wähle **Set up a workflow yourself**

## Schritt 3: Workflow-Datei erstellen

Kopiere den Inhalt von `.github/workflows/build-project.yml` in deine neue Workflow-Datei.

## Schritt 4: Workflow manuell ausführen

### Option A: Über GitHub UI

1. Gehe zu **Actions** Tab
2. Wähle den Workflow "Build and Deploy Project"
3. Klicke auf **Run workflow**
4. Gib die URL zu deiner ZIP-Datei ein (z.B. von einem Release oder direktem Download)
5. Klicke auf **Run workflow**

### Option B: Über die Webplayer-Plattform

1. Öffne die Webplayer-Plattform
2. Klicke auf den Tab **🐙 GitHub kompilieren**
3. Gib die GitHub Repository URL ein (z.B. `https://github.com/user/repo`)
4. Die Plattform lädt automatisch die ZIP-Datei herunter

## Schritt 5: Kompilierte Version herunterladen

Nach erfolgreicher Kompilierung:

1. Gehe zu **Releases** in deinem Repository
2. Lade die kompilierte ZIP-Datei herunter
3. Verwende diese in der Webplayer-Plattform

## Alternative: GitHub Pages

Falls du die kompilierte Version direkt hosten möchtest, kannst du den Workflow erweitern, um GitHub Pages zu verwenden:

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./project/dist  # oder build/out je nach Projekt
```

## Unterstützte Projekttypen

- React (Create React App, Vite, Next.js)
- Vue.js
- Angular
- TypeScript-Projekte mit npm build scripts
- Alle Projekte mit `package.json` und Build-Script

## Troubleshooting

**Problem:** Workflow schlägt fehl
- Prüfe, ob `package.json` vorhanden ist
- Prüfe, ob ein Build-Script definiert ist (`npm run build`)
- Prüfe die Logs im Actions Tab

**Problem:** Keine kompilierte Datei gefunden
- Stelle sicher, dass der Build-Ordner `dist/`, `build/` oder `out/` heißt
- Prüfe die Build-Logs, ob der Build erfolgreich war

**Problem:** Dependencies fehlen
- Stelle sicher, dass alle Dependencies in `package.json` definiert sind
- Prüfe, ob `package-lock.json` vorhanden ist

