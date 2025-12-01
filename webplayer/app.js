let currentZipData = null;
let extractedFiles = {};

// DOM-Elemente
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const errorSection = document.getElementById('error-section');
const playerSection = document.getElementById('player-section');
const appFrame = document.getElementById('app-frame');
const appTitle = document.getElementById('app-title');
const fileTree = document.getElementById('file-tree');
const errorMessage = document.getElementById('error-message');

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
uploadArea.addEventListener('click', () => fileInput.click());

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.zip')) {
        processFile(files[0]);
    } else {
        showError('Bitte lade eine ZIP-Datei hoch.');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
        processFile(file);
    } else {
        showError('Bitte wähle eine ZIP-Datei aus.');
    }
}

async function processFile(file) {
    try {
        showLoading();
        hideError();
        hidePlayer();

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        currentZipData = zip;
        extractedFiles = {};
        
        // Alle Dateien extrahieren
        const filePromises = [];
        zip.forEach(async (relativePath, file) => {
            if (!file.dir) {
                filePromises.push(
                    file.async('text').then(content => {
                        extractedFiles[relativePath] = content;
                    }).catch(() => {
                        // Binärdateien überspringen
                        file.async('blob').then(blob => {
                            extractedFiles[relativePath] = blob;
                        });
                    })
                );
            }
        });

        await Promise.all(filePromises);
        
        // Projekt analysieren
        const projectInfo = analyzeProject(extractedFiles);
        
        // Prüfe ob TypeScript-Projekt ohne kompilierte Dateien
        if (projectInfo.hasTypeScript && !projectInfo.hasCompiledFiles && !projectInfo.hasIndexHtml) {
            showError(
                `Dieses Projekt enthält TypeScript/TSX-Dateien, die nicht direkt im Browser ausgeführt werden können.\n\n` +
                `Gefundene TSX/TS-Dateien: ${projectInfo.tsxFiles.length}\n` +
                `Gefundene JS-Dateien: ${projectInfo.jsFiles.length}\n\n` +
                `Bitte kompiliere das Projekt zuerst mit "npm run build" oder verwende eine bereits kompilierte Version.`
            );
            return;
        }
        
        // HTML-Datei finden oder erstellen
        const htmlContent = findOrCreateHTML(extractedFiles, projectInfo);
        
        if (!htmlContent) {
            showError('Keine HTML-Datei gefunden. Bitte stelle sicher, dass das Projekt eine index.html enthält.');
            return;
        }
        
        // Anwendung im Player anzeigen
        displayApp(htmlContent, projectInfo);
        
    } catch (error) {
        console.error('Fehler beim Verarbeiten der ZIP-Datei:', error);
        showError(`Fehler beim Verarbeiten der Datei: ${error.message}`);
    }
}

function analyzeProject(files) {
    const fileNames = Object.keys(files);
    const info = {
        name: 'Google AI Studio Export',
        type: 'unknown',
        entryPoint: null,
        hasPackageJson: false,
        hasIndexHtml: false,
        hasTypeScript: false,
        hasCompiledFiles: false,
        buildDir: null,
        tsxFiles: [],
        jsFiles: []
    };

    // TypeScript-Dateien finden
    info.tsxFiles = fileNames.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    info.jsFiles = fileNames.filter(f => f.endsWith('.js') && !f.includes('node_modules'));
    info.hasTypeScript = info.tsxFiles.length > 0;

    // Nach Build-Ordnern suchen
    const buildDirs = ['dist', 'build', 'out', '.next', 'public'];
    for (const dir of buildDirs) {
        if (fileNames.some(f => f.startsWith(dir + '/') && f.endsWith('.html'))) {
            info.buildDir = dir;
            info.hasCompiledFiles = true;
            break;
        }
    }

    // package.json suchen
    const packageJson = fileNames.find(f => f.includes('package.json'));
    if (packageJson) {
        try {
            const pkg = JSON.parse(files[packageJson]);
            info.name = pkg.name || info.name;
            info.hasPackageJson = true;
            if (pkg.main) {
                info.entryPoint = pkg.main;
            }
            // Prüfe ob es ein Build-Script gibt
            if (pkg.scripts && (pkg.scripts.build || pkg.scripts.dev)) {
                info.needsBuild = true;
            }
        } catch (e) {
            console.warn('Konnte package.json nicht parsen:', e);
        }
    }

    // index.html suchen (priorisiere Build-Ordner)
    let indexHtml = null;
    if (info.buildDir) {
        indexHtml = fileNames.find(f => 
            f.startsWith(info.buildDir + '/') && 
            f.toLowerCase().endsWith('index.html')
        );
    }
    if (!indexHtml) {
        indexHtml = fileNames.find(f => 
            f.toLowerCase().endsWith('index.html') || 
            f.toLowerCase().includes('index.html')
        );
    }
    if (indexHtml) {
        info.hasIndexHtml = true;
        info.entryPoint = indexHtml;
    }

    // Projekttyp bestimmen
    if (fileNames.some(f => f.includes('react') || f.includes('React') || f.includes('tsx'))) {
        info.type = 'react';
    } else if (fileNames.some(f => f.includes('angular'))) {
        info.type = 'angular';
    } else if (fileNames.some(f => f.includes('vue'))) {
        info.type = 'vue';
    } else if (info.hasIndexHtml) {
        info.type = 'html';
    }

    return info;
}

function findOrCreateHTML(files, projectInfo) {
    // Priorisiere index.html aus Build-Ordner
    let indexHtml = null;
    
    if (projectInfo.buildDir) {
        indexHtml = Object.keys(files).find(f => 
            f.startsWith(projectInfo.buildDir + '/') && 
            f.toLowerCase().endsWith('index.html')
        );
    }
    
    // Fallback: normale index.html
    if (!indexHtml) {
        indexHtml = Object.keys(files).find(f => 
            f.toLowerCase().endsWith('index.html')
        );
    }
    
    if (indexHtml) {
        let html = files[indexHtml];
        
        // Relative Pfade anpassen
        html = adjustRelativePaths(html, indexHtml, files);
        
        return html;
    }

    // Sonst erstelle eine einfache HTML-Seite
    return createDefaultHTML(files, projectInfo);
}

function adjustRelativePaths(html, htmlPath, files) {
    console.log('🔧 Passe Pfade an für:', htmlPath);
    console.log('📁 Verfügbare Dateien:', Object.keys(files).slice(0, 10));
    
    // Basis-Pfad ermitteln
    const basePath = htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1);
    const basePathNoSlash = basePath.replace(/^\//, ''); // Entferne führenden Slash
    
    // Alle Dateien als Map für schnellen Zugriff
    const fileMap = {};
    const fileNameMap = {}; // Map für Dateinamen ohne Pfad
    Object.keys(files).forEach(path => {
        if (typeof files[path] === 'string') {
            fileMap[path] = files[path];
            const fileName = path.split('/').pop();
            if (fileName) {
                fileNameMap[fileName] = path;
            }
        }
    });

    let modifiedHtml = html;
    
    // 1. CSS-Dateien einbetten (alle Varianten: relative, absolute, Hash-Namen)
    const cssFiles = Object.keys(files).filter(p => p.endsWith('.css') && typeof files[p] === 'string');
    console.log('🎨 Gefundene CSS-Dateien:', cssFiles);
    
    // Finde alle Link-Tags im HTML (auch die, die noch nicht ersetzt wurden)
    const linkTagRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']*)["'][^>]*>/gi;
    const embeddedCss = [];
    let linkMatch;
    
    // Durchsuche HTML nach allen Stylesheet-Links
    while ((linkMatch = linkTagRegex.exec(html)) !== null) {
        const href = linkMatch[1];
        console.log('🔍 Suche CSS für:', href);
        
        // Suche nach passender CSS-Datei
        let foundCssFile = null;
        let foundCssContent = null;
        
        // Strategie 1: Exakter Pfad-Match (mit und ohne führenden Slash)
        const normalizedHref = href.replace(/^\//, '');
        if (files[normalizedHref]) {
            foundCssFile = normalizedHref;
            foundCssContent = files[normalizedHref];
        }
        // Strategie 2: Dateiname-Match (für Hash-Namen)
        else {
            const hrefFileName = href.split('/').pop();
            for (const cssPath of cssFiles) {
                const cssFileName = cssPath.split('/').pop();
                // Match wenn Dateiname übereinstimmt oder Hash-Teil übereinstimmt
                if (cssFileName === hrefFileName || 
                    hrefFileName.includes(cssFileName.split('-')[0]) ||
                    cssFileName.includes(hrefFileName.split('-')[0])) {
                    foundCssFile = cssPath;
                    foundCssContent = files[cssPath];
                    break;
                }
            }
        }
        
        if (foundCssContent) {
            console.log('✅ CSS gefunden:', href, '->', foundCssFile);
            embeddedCss.push(foundCssContent);
            // Ersetze den Link-Tag
            modifiedHtml = modifiedHtml.replace(linkMatch[0], '');
        } else {
            console.warn('⚠️ CSS-Datei nicht gefunden für:', href);
        }
    }
    
    // Füge alle eingebetteten CSS-Dateien im <head> ein
    if (embeddedCss.length > 0) {
        const cssHtml = embeddedCss.map(css => `<style>${css}</style>`).join('\n');
        // Füge vor </head> ein, oder am Anfang wenn kein </head> vorhanden
        if (modifiedHtml.includes('</head>')) {
            modifiedHtml = modifiedHtml.replace('</head>', `${cssHtml}\n</head>`);
        } else if (modifiedHtml.includes('<head>')) {
            modifiedHtml = modifiedHtml.replace('<head>', `<head>\n${cssHtml}`);
        } else {
            // Füge nach <html> ein
            modifiedHtml = modifiedHtml.replace(/<html[^>]*>/, `$&\n${cssHtml}`);
        }
        console.log('✅', embeddedCss.length, 'CSS-Dateien eingebettet');
    }

    // 2. TypeScript-Dateien entfernen
    const tsExtensions = ['.ts', '.tsx', '.mts', '.cts'];
    tsExtensions.forEach(ext => {
        const tsRegex = new RegExp(
            `<script[^>]*src=["'][^"']*\\${ext}["'][^>]*></script>`,
            'gi'
        );
        modifiedHtml = modifiedHtml.replace(tsRegex, '<!-- TypeScript-Datei entfernt -->');
    });

    // 3. JavaScript-Dateien finden und einbetten
    const jsFiles = Object.keys(files).filter(p => p.endsWith('.js') && typeof files[p] === 'string');
    console.log('📜 Gefundene JS-Dateien:', jsFiles);
    
    const scriptsToEmbed = [];
    const scriptOrder = []; // Reihenfolge beibehalten
    
    // Finde alle Script-Tags im HTML
    const scriptTagRegex = /<script[^>]*src=["']([^"']*)["'][^>]*><\/script>/gi;
    let match;
    while ((match = scriptTagRegex.exec(html)) !== null) {
        const src = match[1];
        const isModule = match[0].includes('type="module"') || match[0].includes("type='module'");
        
        // Suche nach passender JS-Datei
        let foundFile = null;
        
        // Versuche verschiedene Matching-Strategien
        // 1. Exakter Pfad
        if (files[src.replace(/^\//, '')]) {
            foundFile = src.replace(/^\//, '');
        }
        // 2. Dateiname-Match
        else if (src.includes('/')) {
            const fileName = src.split('/').pop();
            if (fileNameMap[fileName]) {
                foundFile = fileNameMap[fileName];
            }
        }
        // 3. Teilstring-Match (für Hash-Namen)
        else {
            const fileName = src.split('/').pop();
            const matchingFile = jsFiles.find(f => f.includes(fileName) || fileName.includes(f.split('/').pop()));
            if (matchingFile) {
                foundFile = matchingFile;
            }
        }
        
        if (foundFile && files[foundFile]) {
            console.log('✅ JS-Datei gefunden:', src, '->', foundFile);
            scriptsToEmbed.push({
                content: files[foundFile],
                isModule: isModule,
                originalSrc: src
            });
            scriptOrder.push(match.index);
        } else {
            console.warn('⚠️ JS-Datei nicht gefunden:', src);
        }
    }
    
    // Entferne alle Script-Tags (werden später wieder eingefügt)
    modifiedHtml = modifiedHtml.replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '');
    
    // 4. Alle Scripts am Ende einfügen (Module zuerst, dann normale)
    const moduleScripts = scriptsToEmbed.filter(s => s.isModule).map(s => s.content);
    const normalScripts = scriptsToEmbed.filter(s => !s.isModule).map(s => s.content);
    
    const allScripts = [...moduleScripts, ...normalScripts];
    if (allScripts.length > 0) {
        const scriptsHtml = allScripts.map((js, idx) => {
            const isModule = idx < moduleScripts.length;
            return `<script${isModule ? ' type="module"' : ''}>${js}</script>`;
        }).join('\n');
        
        if (modifiedHtml.includes('</body>')) {
            modifiedHtml = modifiedHtml.replace('</body>', `${scriptsHtml}\n</body>`);
        } else {
            modifiedHtml += `\n${scriptsHtml}\n</body>`;
        }
        console.log('✅', allScripts.length, 'Scripts eingebettet');
    }

    return modifiedHtml;
}

function getRelativePath(from, to) {
    // Vereinfachte Pfadberechnung
    if (to.startsWith('/')) return to.substring(1);
    if (to.startsWith('./')) return to.substring(2);
    return to;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createDefaultHTML(files, projectInfo) {
    const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html'));
    const cssFiles = Object.keys(files).filter(f => f.endsWith('.css'));
    const jsFiles = Object.keys(files).filter(f => f.endsWith('.js'));

    let html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectInfo.name}</title>`;

    // CSS einbetten
    cssFiles.forEach(cssFile => {
        if (typeof files[cssFile] === 'string') {
            html += `\n    <style>${files[cssFile]}</style>`;
        }
    });

    html += `\n</head>
<body>
    <div id="app">
        <h1>${projectInfo.name}</h1>
        <p>Anwendung wird geladen...</p>
    </div>`;

    // JavaScript einbetten
    jsFiles.forEach(jsFile => {
        if (typeof files[jsFile] === 'string') {
            html += `\n    <script>${files[jsFile]}</script>`;
        }
    });

    html += `\n</body>
</html>`;

    return html;
}

function displayApp(htmlContent, projectInfo) {
    appTitle.textContent = projectInfo.name;
    
    // HTML als Blob erstellen und im iframe laden
    // Hinweis: allow-same-origin wurde entfernt, um Sandboxing zu verbessern
    // Die App läuft in einer isolierten Umgebung
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    appFrame.src = url;

    // Dateibaum anzeigen
    displayFileTree(extractedFiles);

    hideLoading();
    showPlayer();
}

function displayFileTree(files) {
    const tree = {};
    
    // Dateistruktur aufbauen
    Object.keys(files).sort().forEach(path => {
        const parts = path.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                current[part] = { type: 'file', path };
            } else {
                if (!current[part]) {
                    current[part] = { type: 'folder', children: {} };
                }
                current = current[part].children;
            }
        });
    });

    // HTML generieren
    fileTree.innerHTML = renderTree(tree, '');
}

function renderTree(node, indent) {
    let html = '';
    const entries = Object.entries(node).sort((a, b) => {
        if (a[1].type === 'folder' && b[1].type !== 'folder') return -1;
        if (a[1].type !== 'folder' && b[1].type === 'folder') return 1;
        return a[0].localeCompare(b[0]);
    });

    entries.forEach(([name, data]) => {
        const isFolder = data.type === 'folder';
        const className = isFolder ? 'folder' : 'file';
        const icon = isFolder ? '📁' : '📄';
        
        html += `<div class="file-item ${className}" style="padding-left: ${indent.length * 10}px">
            ${icon} ${name}
        </div>`;
        
        if (isFolder && data.children) {
            html += renderTree(data.children, indent + '  ');
        }
    });

    return html;
}

function showLoading() {
    uploadSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    playerSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
}

function hideLoading() {
    loadingSection.classList.add('hidden');
}

function showError(message) {
    // Erlaube mehrzeilige Fehlermeldungen
    errorMessage.innerHTML = message.replace(/\n/g, '<br>');
    uploadSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    playerSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
}

function hideError() {
    errorSection.classList.add('hidden');
}

function showPlayer() {
    uploadSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
}

function hidePlayer() {
    playerSection.classList.add('hidden');
}

function resetUpload() {
    currentZipData = null;
    extractedFiles = {};
    fileInput.value = '';
    appFrame.src = '';
    
    uploadSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    playerSection.classList.add('hidden');
}

function toggleFullscreen() {
    playerSection.classList.toggle('fullscreen');
}

function switchTab(tab) {
    // Tabs umschalten
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'upload') {
        document.querySelector('.tab-btn').classList.add('active');
        document.getElementById('upload-tab').classList.add('active');
    } else if (tab === 'github') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('github-tab').classList.add('active');
    }
}

async function processGitHubRepo() {
    const repoUrl = document.getElementById('github-repo').value.trim();
    
    if (!repoUrl) {
        showError('Bitte gib eine GitHub Repository URL ein.');
        return;
    }
    
    try {
        showLoading();
        hideError();
        hidePlayer();
        
        // Prüfe ob es eine ZIP-URL ist
        let zipUrl = repoUrl;
        if (repoUrl.includes('github.com') && !repoUrl.endsWith('.zip')) {
            // Konvertiere GitHub URL zu ZIP-Download-URL
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (match) {
                const [, user, repo] = match;
                // Versuche verschiedene Branch-Namen
                const branches = ['main', 'master', 'develop'];
                let found = false;
                
                for (const branch of branches) {
                    try {
                        const testUrl = `https://github.com/${user}/${repo}/archive/refs/heads/${branch}.zip`;
                        const response = await fetch(testUrl, { method: 'HEAD' });
                        if (response.ok) {
                            zipUrl = testUrl;
                            found = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!found) {
                    zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`;
                }
            }
        }
        
        // Lade ZIP von GitHub
        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Fehler beim Laden der ZIP-Datei: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], 'github-project.zip', { type: 'application/zip' });
        
        // Verarbeite wie normale ZIP-Datei
        await processFile(file);
        
    } catch (error) {
        console.error('Fehler beim Verarbeiten des GitHub Repositories:', error);
        showError(`Fehler: ${error.message}\n\nBitte stelle sicher, dass:\n- Die URL korrekt ist\n- Das Repository öffentlich ist\n- Die ZIP-Datei heruntergeladen werden kann`);
    }
}

