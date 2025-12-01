<?php
// Cache-Header setzen - keine Caching für Build-Status
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

if (!isset($_GET['buildId']) && !isset($_GET['appName'])) {
    echo json_encode(['success' => false, 'message' => 'buildId oder appName erforderlich']);
    exit;
}

$appName = isset($_GET['appName']) ? $_GET['appName'] : null;
$buildId = isset($_GET['buildId']) ? $_GET['buildId'] : null;
$debug = isset($_GET['debug']) && $_GET['debug'] === '1';

// Finde App-Ordner
if ($appName) {
    $appDir = __DIR__ . '/app/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $appName);
} else {
    // Suche nach buildId
    $appBaseDir = __DIR__ . '/app';
    $appDir = null;
    
    if (is_dir($appBaseDir)) {
        $dirs = scandir($appBaseDir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            $statusFile = $appBaseDir . '/' . $dir . '/.build-status.json';
            if (file_exists($statusFile)) {
                $status = json_decode(file_get_contents($statusFile), true);
                if (isset($status['buildId']) && $status['buildId'] === $buildId) {
                    $appDir = $appBaseDir . '/' . $dir;
                    break;
                }
            }
        }
    }
}

if (!$appDir || !is_dir($appDir)) {
    echo json_encode(['success' => false, 'message' => 'App nicht gefunden']);
    exit;
}

$statusFile = $appDir . '/.build-status.json';
if (!file_exists($statusFile)) {
    echo json_encode(['status' => 'unknown', 'message' => 'Kein Build-Status gefunden']);
    exit;
}

$status = json_decode(file_get_contents($statusFile), true);

// Cache leeren vor der Prüfung (wichtig für File-System-Caching)
clearstatcache(true, $appDir);
clearstatcache(true, $appDir . '/index.html');
clearstatcache(true, $appDir . '/assets');

// Prüfe ob kompilierte Dateien vorhanden sind
$hasIndexHtml = file_exists($appDir . '/index.html');
$hasAssets = is_dir($appDir . '/assets');

// Debug: Prüfe was gefunden wurde
if ($debug) {
    $debugInfo['app_dir'] = $appDir;
    $debugInfo['has_index_html'] = $hasIndexHtml;
    $debugInfo['has_assets'] = $hasAssets;
    $debugInfo['status_file_content'] = $status;
    $debugInfo['app_dir_contents'] = scandir($appDir);
}

if ($hasIndexHtml && $hasAssets) {
    $status['status'] = 'completed';
    $status['message'] = 'Build erfolgreich abgeschlossen';
    file_put_contents($statusFile, json_encode($status));
    
    $response = [
        'success' => true,
        'status' => 'completed',
        'message' => 'Build erfolgreich abgeschlossen',
        'path' => '/app/' . basename($appDir)
    ];
    if ($debug) $response['debug'] = $debugInfo ?? [];
    echo json_encode($response);
    exit;
}

// Falls noch nicht kompiliert, prüfe GitHub Releases
// Prüfe sowohl ob buildId vorhanden ist UND ob Status pending ist
$currentStatus = $status['status'] ?? 'pending';
$hasBuildId = isset($status['buildId']) && !empty($status['buildId']);

// Wenn buildId als GET-Parameter übergeben wurde, verwende diese (kann aktueller sein)
if ($buildId && !empty($buildId)) {
    $status['buildId'] = $buildId;
    $hasBuildId = true;
}

if ($debug) {
    $debugInfo['current_status'] = $currentStatus;
    $debugInfo['has_buildId'] = $hasBuildId;
    $debugInfo['buildId_from_status'] = $status['buildId'] ?? null;
    $debugInfo['buildId_from_get'] = $buildId;
}

if ($hasBuildId && $currentStatus === 'pending') {
    $config = require __DIR__ . '/config.php';
    $githubConfig = $config['github'];
    
    // Prüfe die letzten Releases (mehr Releases prüfen)
    $apiUrl = "https://api.github.com/repos/{$githubConfig['owner']}/{$githubConfig['repo']}/releases?per_page=10";
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/vnd.github.v3+json',
        'User-Agent: App-Manager'
    ]);
    
    $releasesResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $debugInfo = [];
    if ($debug) {
        $debugInfo['github_api_url'] = $apiUrl;
        $debugInfo['github_api_http_code'] = $httpCode;
        $debugInfo['searched_buildId'] = $status['buildId'];
    }
    
    if ($httpCode === 200 && $releasesResponse) {
        $releases = json_decode($releasesResponse, true);
        
        if ($debug) {
            $debugInfo['releases_count'] = count($releases);
            $debugInfo['release_tags'] = array_map(function($r) { return $r['tag_name']; }, $releases);
        }
        
        foreach ($releases as $release) {
            $releaseBody = $release['body'] ?? '';
            $releaseBodyLower = strtolower($releaseBody);
            
            // Suche nach buildId (case-insensitive)
            $searchBuildId = $status['buildId'] ?? '';
            $buildIdInBody = !empty($searchBuildId) && (
                strpos($releaseBody, $searchBuildId) !== false || 
                strpos($releaseBodyLower, strtolower($searchBuildId)) !== false
            );
            
            // Suche nach App-Name (case-insensitive)
            $searchAppName = $status['appName'] ?? $appName ?? '';
            $appNameInBody = !empty($searchAppName) && (
                strpos($releaseBody, $searchAppName) !== false || 
                strpos($releaseBodyLower, strtolower($searchAppName)) !== false
            );
            
            if ($debug) {
                $debugInfo['checking_release'] = $release['tag_name'];
                $debugInfo['release_body_preview'] = substr($releaseBody, 0, 500);
                $debugInfo['searched_buildId'] = $searchBuildId;
                $debugInfo['searched_appName'] = $searchAppName;
                $debugInfo['buildId_found'] = $buildIdInBody;
                $debugInfo['appName_found'] = $appNameInBody;
            }
            
            // Prüfe ob buildId oder appName im Release-Body steht
            if ($buildIdInBody || $appNameInBody) {
                if ($debug) $debugInfo['found_matching_release'] = $release['tag_name'];
                
                // Release gefunden - lade kompilierte ZIP herunter
                if (isset($release['assets']) && count($release['assets']) > 0) {
                    if ($debug) $debugInfo['assets_count'] = count($release['assets']);
                    
                    foreach ($release['assets'] as $asset) {
                        if ($asset['name'] === 'compiled-project.zip') {
                            if ($debug) $debugInfo['found_asset'] = $asset['browser_download_url'];
                            
                            // Lade kompilierte ZIP herunter mit cURL (robuster als file_get_contents)
                            $zipPath = $appDir . '/compiled.zip';
                            $downloadUrl = $asset['browser_download_url'];
                            
                            $ch = curl_init($downloadUrl);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                            $zipContent = curl_exec($ch);
                            $downloadHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                            $curlError = curl_error($ch);
                            curl_close($ch);
                            
                            if ($debug) {
                                $debugInfo['download_http_code'] = $downloadHttpCode;
                                $debugInfo['download_size'] = strlen($zipContent);
                                $debugInfo['curl_error'] = $curlError;
                            }
                            
                            if ($downloadHttpCode === 200 && $zipContent && strlen($zipContent) > 0) {
                                if (file_put_contents($zipPath, $zipContent)) {
                                    // Entpacke
                                    $zip = new ZipArchive();
                                    if ($zip->open($zipPath) === TRUE) {
                                        $extractResult = $zip->extractTo($appDir);
                                        $zip->close();
                                        unlink($zipPath);
                                        
                                        // Warte kurz und prüfe dann explizit, ob Dateien vorhanden sind
                                        // Das hilft gegen File-System-Caching
                                        clearstatcache(true, $appDir);
                                        usleep(100000); // 100ms warten
                                        clearstatcache(true, $appDir . '/index.html');
                                        clearstatcache(true, $appDir . '/assets');
                                        
                                        // Prüfe nochmal explizit
                                        $hasIndexHtml = file_exists($appDir . '/index.html');
                                        $hasAssets = is_dir($appDir . '/assets');
                                        
                                        if ($debug) {
                                            $debugInfo['extract_success'] = $extractResult;
                                            $debugInfo['extracted_files'] = scandir($appDir);
                                            $debugInfo['has_index_after_extract'] = $hasIndexHtml;
                                            $debugInfo['has_assets_after_extract'] = $hasAssets;
                                        }
                                        
                                        if ($hasIndexHtml && $hasAssets) {
                                            // Aktualisiere Status
                                            $status['status'] = 'completed';
                                            $status['completed'] = date('Y-m-d H:i:s');
                                            file_put_contents($statusFile, json_encode($status));
                                            
                                            // Cache leeren für diese Dateien
                                            clearstatcache(true, $statusFile);
                                            
                                            $response = [
                                                'success' => true,
                                                'status' => 'completed',
                                                'message' => 'Build erfolgreich abgeschlossen',
                                                'path' => '/app/' . basename($appDir)
                                            ];
                                            if ($debug) $response['debug'] = $debugInfo;
                                            echo json_encode($response);
                                            exit;
                                        } else {
                                            if ($debug) $debugInfo['files_not_found_after_extract'] = true;
                                        }
                                    } else {
                                        if ($debug) $debugInfo['zip_extract_error'] = 'Konnte ZIP nicht öffnen';
                                    }
                                } else {
                                    if ($debug) $debugInfo['file_write_error'] = 'Konnte ZIP nicht speichern';
                                }
                            } else {
                                if ($debug) $debugInfo['download_failed'] = 'Download fehlgeschlagen';
                            }
                        }
                    }
                } else {
                    if ($debug) $debugInfo['no_assets'] = 'Release hat keine Assets';
                }
            }
        }
        
        if ($debug && !isset($debugInfo['found_matching_release'])) {
            $debugInfo['buildId_not_found'] = true;
            $debugInfo['release_bodies'] = array_map(function($r) {
                return substr($r['body'] ?? '', 0, 500);
            }, $releases);
        }
    } else {
        if ($debug) {
            $debugInfo['github_api_error'] = substr($releasesResponse, 0, 500);
        }
    }
}

$response = [
    'success' => true,
    'status' => $status['status'] ?? 'pending',
    'message' => 'Build läuft noch...',
    'buildId' => $status['buildId'] ?? null
];
if ($debug && isset($debugInfo)) {
    $response['debug'] = $debugInfo;
}
echo json_encode($response);
?>

