<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Nur POST-Requests erlaubt']);
    exit;
}

if (!isset($_FILES['appFile']) || !isset($_POST['appName'])) {
    echo json_encode(['success' => false, 'message' => 'Datei und App-Name erforderlich']);
    exit;
}

$file = $_FILES['appFile'];
$appName = trim($_POST['appName']);

// Validierung
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Upload-Fehler: ' . $file['error']]);
    exit;
}

if ($file['type'] !== 'application/zip' && $file['type'] !== 'application/x-zip-compressed') {
    echo json_encode(['success' => false, 'message' => 'Nur ZIP-Dateien erlaubt']);
    exit;
}

if (empty($appName)) {
    echo json_encode(['success' => false, 'message' => 'App-Name darf nicht leer sein']);
    exit;
}

// Lade Konfiguration
$config = require __DIR__ . '/config.php';

// Erstelle temp-Ordner falls nicht vorhanden
$tempDir = $config['temp_dir'];
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0755, true);
}

// Generiere eindeutigen Dateinamen
$uniqueId = uniqid($appName . '_', true);
$tempZipPath = $tempDir . '/' . $uniqueId . '.zip';

// Speichere ZIP-Datei temporär
if (!move_uploaded_file($file['tmp_name'], $tempZipPath)) {
    echo json_encode(['success' => false, 'message' => 'Konnte Datei nicht speichern']);
    exit;
}

// Erstelle öffentliche URL für die ZIP-Datei (für GitHub Actions)
// Annahme: Die Datei ist über HTTP erreichbar
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
    . '://' . $_SERVER['HTTP_HOST'];
$zipUrl = $baseUrl . '/temp/' . basename($tempZipPath);

// Erstelle App-Ordner (wird später mit kompiliertem Build gefüllt)
$appDir = __DIR__ . '/app/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $appName);
if (file_exists($appDir)) {
    unlink($tempZipPath);
    echo json_encode(['success' => false, 'message' => 'App mit diesem Namen existiert bereits']);
    exit;
}

if (!mkdir($appDir, 0755, true)) {
    unlink($tempZipPath);
    echo json_encode(['success' => false, 'message' => 'Konnte App-Ordner nicht erstellen']);
    exit;
}

// Speichere Build-Status
$statusFile = $appDir . '/.build-status.json';
file_put_contents($statusFile, json_encode([
    'status' => 'pending',
    'appName' => $appName,
    'zipUrl' => $zipUrl,
    'created' => date('Y-m-d H:i:s'),
    'buildId' => $uniqueId
]));

// Triggere GitHub Actions Workflow
$githubConfig = $config['github'];
$apiUrl = "https://api.github.com/repos/{$githubConfig['owner']}/{$githubConfig['repo']}/dispatches";

$payload = [
    'event_type' => 'build-project',
    'client_payload' => [
        'zip_url' => $zipUrl,
        'app_name' => $appName,
        'build_id' => $uniqueId
    ]
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/vnd.github.v3+json',
    'Authorization: token ' . $githubConfig['token'],
    'Content-Type: application/json',
    'User-Agent: App-Manager'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 204) {
    rmdir($appDir);
    unlink($tempZipPath);
    $errorMsg = 'Fehler beim Triggern des GitHub Workflows';
    if ($response) {
        $errorData = json_decode($response, true);
        if (isset($errorData['message'])) {
            $errorMsg .= ': ' . $errorData['message'];
        }
    }
    echo json_encode(['success' => false, 'message' => $errorMsg]);
    exit;
}

echo json_encode([
    'success' => true, 
    'message' => 'Projekt erfolgreich hochgeladen. Kompilierung läuft...',
    'buildId' => $uniqueId,
    'appName' => $appName
]);
?>
