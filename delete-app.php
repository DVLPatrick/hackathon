<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Nur POST-Requests erlaubt']);
    exit;
}

if (!isset($_POST['appName'])) {
    echo json_encode(['success' => false, 'message' => 'App-Name erforderlich']);
    exit;
}

$appName = trim($_POST['appName']);
$appName = preg_replace('/[^a-zA-Z0-9_-]/', '', $appName);

if (empty($appName)) {
    echo json_encode(['success' => false, 'message' => 'Ungültiger App-Name']);
    exit;
}

$appDir = __DIR__ . '/app/' . $appName;

if (!is_dir($appDir)) {
    echo json_encode(['success' => false, 'message' => 'App nicht gefunden']);
    exit;
}

// Lösche den gesamten App-Ordner rekursiv
function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return true;
    }
    
    if (!is_dir($dir)) {
        return unlink($dir);
    }
    
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }
        
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        
        if (!deleteDirectory($path)) {
            return false;
        }
    }
    
    return rmdir($dir);
}

if (deleteDirectory($appDir)) {
    echo json_encode(['success' => true, 'message' => 'App erfolgreich gelöscht']);
} else {
    echo json_encode(['success' => false, 'message' => 'Fehler beim Löschen der App']);
}
?>

