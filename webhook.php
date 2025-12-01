<?php
// GitHub Webhook Handler für Build-Abschluss
header('Content-Type: application/json');

$config = require __DIR__ . '/config.php';
$input = file_get_contents('php://input');
$payload = json_decode($input, true);

// Optional: Webhook-Signatur validieren
if (isset($config['webhook_secret']) && $config['webhook_secret'] !== 'DEIN_WEBHOOK_SECRET') {
    $signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
    // Hier könnte man die Signatur validieren
}

// Prüfe ob es ein Release-Event ist
if (isset($payload['action']) && $payload['action'] === 'published' && isset($payload['release'])) {
    $release = $payload['release'];
    $buildId = null;
    $appName = null;
    
    // Extrahiere buildId und appName aus Release-Body oder Tag
    if (isset($release['body'])) {
        if (preg_match('/build_id[:\s]+([a-zA-Z0-9_-]+)/i', $release['body'], $matches)) {
            $buildId = $matches[1];
        }
        if (preg_match('/app_name[:\s]+([a-zA-Z0-9_-]+)/i', $release['body'], $matches)) {
            $appName = $matches[1];
        }
    }
    
    if ($buildId && $appName) {
        // Lade kompilierte ZIP-Datei herunter
        $assetUrl = null;
        if (isset($release['assets']) && count($release['assets']) > 0) {
            foreach ($release['assets'] as $asset) {
                if ($asset['name'] === 'compiled-project.zip') {
                    $assetUrl = $asset['browser_download_url'];
                    break;
                }
            }
        }
        
        if ($assetUrl) {
            $appDir = __DIR__ . '/app/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $appName);
            
            if (is_dir($appDir)) {
                // Lösche alte Dateien
                $files = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($appDir, RecursiveDirectoryIterator::SKIP_DOTS),
                    RecursiveIteratorIterator::CHILD_FIRST
                );
                
                foreach ($files as $file) {
                    if ($file->isDir()) {
                        rmdir($file->getRealPath());
                    } else {
                        unlink($file->getRealPath());
                    }
                }
                
                // Lade kompilierte ZIP herunter
                $zipPath = $appDir . '/compiled.zip';
                file_put_contents($zipPath, file_get_contents($assetUrl));
                
                // Entpacke
                $zip = new ZipArchive();
                if ($zip->open($zipPath) === TRUE) {
                    $zip->extractTo($appDir);
                    $zip->close();
                    unlink($zipPath);
                    
                    // Aktualisiere Status
                    $statusFile = $appDir . '/.build-status.json';
                    if (file_exists($statusFile)) {
                        $status = json_decode(file_get_contents($statusFile), true);
                        $status['status'] = 'completed';
                        $status['completed'] = date('Y-m-d H:i:s');
                        file_put_contents($statusFile, json_encode($status));
                    }
                    
                    echo json_encode(['success' => true, 'message' => 'Build erfolgreich installiert']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Fehler beim Entpacken']);
                }
            }
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Ungültiges Event']);
}
?>

