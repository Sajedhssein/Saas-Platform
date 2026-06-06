<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$schema = Illuminate\Support\Facades\Schema::getColumnListing('users');
echo "Users table columns:\n";
echo implode(', ', $schema) . "\n\n";
echo "is_active exists: " . (in_array('is_active', $schema) ? "YES" : "NO") . "\n";

// Get the column definition
if (in_array('is_active', $schema)) {
    $connection = DB::connection();
    $doctrineColumn = $connection->getDoctrineColumn('users', 'is_active');
    echo "Column type: " . $doctrineColumn->getType() . "\n";
    echo "Default: " . ($doctrineColumn->getDefault() ?? 'null') . "\n";
}
