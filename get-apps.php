<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$appBaseDir = __DIR__ . '/app';
$apps = [];

if (is_dir($appBaseDir)) {
    $dirs = scandir($appBaseDir);
    
    foreach ($dirs as $dir) {
        if ($dir === '.' || $dir === '..') {
            continue;
        }
        
        $appPath = $appBaseDir . '/' . $dir;
        
        if (is_dir($appPath) && file_exists($appPath . '/index.html')) {
            $apps[] = [
                'name' => $dir,
                'path' => '/app/' . $dir
            ];
        }
    }
}

echo json_encode($apps);
?>

