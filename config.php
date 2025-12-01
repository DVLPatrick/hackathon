<?php
// GitHub Actions Konfiguration
return [
    'github' => [
        'owner' => 'DVLPatrick',  // GitHub Username oder Organisation
        'repo' => 'hackathon',   // Repository Name
        'token' => 'PRIVATE_TOKEN_HERE',     // GitHub Personal Access Token mit repo-Berechtigung
    ],
    'temp_dir' => __DIR__ . '/temp',        // Temporärer Ordner für Uploads
    'webhook_secret' => 'DEIN_WEBHOOK_SECRET' // Optional: Für Webhook-Validierung
];
?>

