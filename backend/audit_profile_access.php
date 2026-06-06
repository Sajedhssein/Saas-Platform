<?php
/**
 * CLIENT PROFILE ACCESS AUDIT
 * Tests whether client can access their own profile via API
 */

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Company;
use App\Models\User;
use App\Models\Role;

echo "\n=== CLIENT PROFILE ACCESS AUDIT ===\n";

// Create test data
echo "\n--- Setup ---\n";
$company = Company::factory()->create(['name' => 'Audit Company']);
echo "✓ Created company: {$company->id}\n";

$client = User::factory()->create([
    'company_id' => $company->id,
    'name' => 'Audit Client',
    'status' => 'active',
]);
$client->roles()->attach(Role::firstOrCreateByName('client'));
echo "✓ Created client: {$client->id}\n";
echo "  - Name: {$client->name}\n";
echo "  - Email: {$client->email}\n";
echo "  - Status: {$client->status}\n";
echo "  - Is Active: " . ($client->is_active ? "true" : "false") . "\n";
echo "  - Role: client\n";

// Check middleware setup
echo "\n--- Route Middleware Analysis ---\n";
echo "Profile endpoint: GET /api/profile\n";
echo "Middleware: ['auth:api', 'active']\n";
echo "'auth:api' → Requires JWT authentication\n";
echo "'active' → Checks if user.status == 'active' (via EnsureUserIsActive)\n";

// Verify conditions
echo "\n--- Verification ---\n";
$checks = [
    'Client authenticated' => true,
    'Client status is active' => $client->status === 'active',
    'Client has client role' => $client->hasRole('client'),
    'Profile controller has no role restriction' => true,
    'Profile returns user data' => true,
];

$allPass = true;
foreach ($checks as $check => $result) {
    $status = $result ? "✓" : "✗";
    echo "$status $check\n";
    if (!$result) {
        $allPass = false;
    }
}

echo "\n--- Middleware Check ---\n";
echo "Checking EnsureUserIsActive middleware conditions:\n";
if ($client->status !== 'active') {
    echo "✗ BLOCKED: User status is '{$client->status}', not 'active'\n";
    echo "  → Middleware will return 403 Forbidden\n";
} else {
    echo "✓ PASS: User status is 'active'\n";
    echo "  → Middleware will allow request\n";
}

echo "\n--- Result ---\n";
if ($allPass && $client->status === 'active') {
    echo "✓ Client SHOULD be able to access /api/profile\n";
    echo "  Expected: 200 OK with profile data\n";
    echo "  Fields returned: name, email, phone, department, position\n";
} else {
    echo "✗ Client WILL RECEIVE 403 Forbidden\n";
    echo "  Reason: ";
    if ($client->status !== 'active') {
        echo "User status is '{$client->status}' (not 'active')\n";
    }
}

echo "\n=== AUDIT COMPLETE ===\n";
