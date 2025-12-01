// Lade Apps beim Seitenstart
document.addEventListener('DOMContentLoaded', () => {
    loadApps();
    checkPendingBuilds();
    
    // Upload-Formular Handler
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        const fileInput = document.getElementById('appFile');
        const appName = document.getElementById('appName').value;
        
        if (!fileInput.files[0]) {
            showStatus('Bitte wähle eine ZIP-Datei aus', 'error');
            return;
        }
        
        formData.append('appFile', fileInput.files[0]);
        formData.append('appName', appName);
        
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.textContent = 'Upload läuft...';
        statusDiv.className = '';
        statusDiv.style.display = 'block';
        
        try {
            const response = await fetch('/upload.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus('Projekt hochgeladen. Kompilierung läuft...', 'success', false);
                document.getElementById('uploadForm').reset();
                
                // Starte Build-Status-Polling
                if (result.buildId && result.appName) {
                    console.log('Starte Polling nach Upload:', result);
                    pollBuildStatus(result.buildId, result.appName);
                } else {
                    console.warn('Keine buildId oder appName erhalten:', result);
                    loadApps();
                }
            } else {
                showStatus('Fehler: ' + result.message, 'error');
            }
        } catch (error) {
            showStatus('Fehler beim Upload: ' + error.message, 'error');
        }
    });
});

function showStatus(message, type, autoHide = true) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    
    // Nur automatisch verstecken wenn autoHide true ist und es ein Erfolg ist
    // Build-Status-Meldungen sollen sichtbar bleiben
    if (type === 'success' && autoHide && !message.includes('Kompilierung') && !message.includes('Build')) {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

async function loadApps() {
    try {
        const response = await fetch('/get-apps.php');
        const apps = await response.json();
        
        const appsList = document.getElementById('appsList');
        appsList.innerHTML = '';
        
        if (apps.length === 0) {
            appsList.innerHTML = '<p style="color: #999; font-size: 14px;">Keine Apps vorhanden</p>';
            return;
        }
        
        apps.forEach(app => {
            const appItem = document.createElement('div');
            appItem.className = 'app-item';
            appItem.innerHTML = `
                <div class="app-item-content">
                    <h3>${app.name}</h3>
                    <p>${app.path}</p>
                </div>
                <button class="delete-btn" data-app-name="${app.name}" title="App löschen">×</button>
            `;
            
            // Klick-Handler für App-Auswahl (nicht auf Delete-Button)
            const appContent = appItem.querySelector('.app-item-content');
            appContent.addEventListener('click', () => {
                // Entferne active-Klasse von allen Items
                document.querySelectorAll('.app-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Füge active-Klasse zum geklickten Item hinzu
                appItem.classList.add('active');
                
                // Lade App im iframe
                loadApp(app.path);
            });
            
            // Delete-Button Handler
            const deleteBtn = appItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Verhindere, dass der App-Item-Click ausgelöst wird
                
                if (!confirm(`Möchtest du die App "${app.name}" wirklich löschen?`)) {
                    return;
                }
                
                try {
                    const formData = new FormData();
                    formData.append('appName', app.name);
                    
                    const response = await fetch('/delete-app.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showStatus('App erfolgreich gelöscht', 'success');
                        // Entferne App aus der Liste
                        appItem.remove();
                        // Prüfe ob noch Apps vorhanden sind
                        if (document.querySelectorAll('.app-item').length === 0) {
                            appsList.innerHTML = '<p style="color: #999; font-size: 14px;">Keine Apps vorhanden</p>';
                        }
                        // Leere iframe falls die gelöschte App angezeigt wurde
                        const iframe = document.getElementById('appFrame');
                        if (iframe.src.includes(app.path)) {
                            iframe.src = '';
                            iframe.classList.remove('active');
                            document.getElementById('noAppSelected').classList.remove('hidden');
                        }
                    } else {
                        showStatus('Fehler: ' + result.message, 'error');
                    }
                } catch (error) {
                    showStatus('Fehler beim Löschen: ' + error.message, 'error');
                }
            });
            
            appsList.appendChild(appItem);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Apps:', error);
    }
}

function loadApp(appPath) {
    const iframe = document.getElementById('appFrame');
    const placeholder = document.getElementById('noAppSelected');
    
    iframe.src = appPath;
    iframe.classList.add('active');
    placeholder.classList.add('hidden');
}

async function pollBuildStatus(buildId, appName) {
    const maxAttempts = 120; // 10 Minuten bei 5 Sekunden Intervall (Builds können länger dauern)
    let attempts = 0;
    let pollInterval = null;
    
    const checkStatus = async () => {
        attempts++;
        
        try {
            // Cache-Busting: Timestamp hinzufügen, damit keine gecachte Version verwendet wird
            const timestamp = Date.now();
            const url = `/check-build.php?appName=${encodeURIComponent(appName)}&_t=${timestamp}`;
            const response = await fetch(url, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Debug-Logging
            console.log(`Build-Status Check ${attempts}:`, result);
            console.log(`Status-Wert: "${result.status}"`, `Type: ${typeof result.status}`);
            console.log(`Success-Wert: ${result.success}`, `Type: ${typeof result.success}`);
            
            // Prüfe ob Build abgeschlossen ist (mehrere Varianten prüfen)
            const isCompleted = result.success === true && (
                result.status === 'completed' || 
                result.status === 'Completed' ||
                String(result.status).toLowerCase() === 'completed'
            );
            
            console.log(`Is Completed: ${isCompleted}`);
            
            if (isCompleted) {
                console.log('Build abgeschlossen erkannt! Stoppe Polling...');
                if (pollInterval) {
                    clearTimeout(pollInterval);
                    pollInterval = null;
                }
                showStatus('Build erfolgreich abgeschlossen!', 'success', false);
                // Warte kurz, damit der Status sichtbar ist
                setTimeout(() => {
                    loadApps();
                }, 1000);
                return;
            }
            
            // Prüfe ob es einen Fehler gibt
            if (!result.success) {
                console.error('Build-Status Fehler:', result.message);
                if (attempts < maxAttempts) {
                    pollInterval = setTimeout(checkStatus, 5000);
                    showStatus(`Kompilierung läuft... (${attempts}/${maxAttempts}) - ${result.message || ''}`, 'success');
                } else {
                    showStatus('Build-Timeout. Bitte manuell prüfen.', 'error');
                }
                return;
            }
            
            // Build läuft noch
            if (attempts < maxAttempts) {
                pollInterval = setTimeout(checkStatus, 5000);
                const statusMessage = result.message || 'Kompilierung läuft...';
                showStatus(`${statusMessage} (${attempts}/${maxAttempts})`, 'success');
            } else {
                showStatus('Build-Timeout nach 10 Minuten. Bitte manuell prüfen.', 'error');
            }
        } catch (error) {
            console.error('Fehler beim Prüfen des Build-Status:', error);
            if (attempts < maxAttempts) {
                pollInterval = setTimeout(checkStatus, 5000);
                showStatus(`Kompilierung läuft... (${attempts}/${maxAttempts}) - Fehler: ${error.message}`, 'success');
            } else {
                showStatus('Build-Timeout. Bitte manuell prüfen.', 'error');
            }
        }
    };
    
    // Starte Polling nach 5 Sekunden (Build braucht Zeit zum Starten)
    console.log(`Starte Polling für Build: ${buildId}, App: ${appName}`);
    showStatus('Warte auf Build-Start...', 'success', false);
    pollInterval = setTimeout(checkStatus, 5000);
    
    // Speichere Polling-Info für Debugging
    window.currentPolling = {
        buildId: buildId,
        appName: appName,
        startTime: Date.now()
    };
}

// Prüfe ob es laufende Builds gibt beim Seitenladen
async function checkPendingBuilds() {
    try {
        const apps = await fetch('/get-apps.php').then(r => r.json());
        
        // Prüfe jede App auf laufende Builds
        for (const app of apps) {
            try {
                const response = await fetch(`/check-build.php?appName=${encodeURIComponent(app.name)}`);
                const result = await response.json();
                
                if (result.success && result.status === 'pending' && result.buildId) {
                    console.log(`Laufender Build gefunden für ${app.name}, starte Polling...`);
                    pollBuildStatus(result.buildId, app.name);
                }
            } catch (error) {
                console.error(`Fehler beim Prüfen von ${app.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Fehler beim Prüfen laufender Builds:', error);
    }
}

