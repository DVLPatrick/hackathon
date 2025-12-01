<?php
// Zentrale index.php für alle Apps
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$appBaseDir = __DIR__;

// Extrahiere App-Namen aus der URL
// URL-Format: /app/AppName/ oder /app/AppName/index.php
$pathParts = explode('/', trim(str_replace('/app', '', $requestUri), '/'));
$appName = !empty($pathParts[0]) ? $pathParts[0] : null;

if (!$appName) {
    http_response_code(404);
    echo "App-Name nicht gefunden";
    exit;
}

$appDir = $appBaseDir . '/' . $appName;
$htmlFile = $appDir . '/index.html';

if (!file_exists($htmlFile)) {
    http_response_code(404);
    echo "index.html nicht gefunden für App: " . htmlspecialchars($appName);
    exit;
}

$html = file_get_contents($htmlFile);

// Bestimme den base-Pfad
$basePath = '/app/' . $appName;
$basePath = rtrim($basePath, '/');

// Füge base-Tag hinzu, wenn noch nicht vorhanden
if (stripos($html, '<base') === false) {
    $headPos = stripos($html, '<head>');
    if ($headPos !== false) {
        $insertPos = $headPos + 6;
        $baseTag = "\n    <base href=\"" . $basePath . "/\">";
        $html = substr_replace($html, $baseTag, $insertPos, 0);
    }
}

// Konvertiere absolute Pfade zu relativen (für Assets)
$html = preg_replace('/(src|href)=["\']\/(assets\/[^"\']+)["\']/', '$1="./$2"', $html);

echo $html;
?>

