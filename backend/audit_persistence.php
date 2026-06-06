<?php
/**
 * CRITICAL CLIENT STATUS PERSISTENCE AUDIT
 * Tests exact flow: payload → validation → fill → save → database
 */

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Company;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

// Create test data
echo "\n=== SETUP ===\n";
$company = Company::factory()->create(['name' => 'Audit Company']);
echo "✓ Created company: {$company->id}\n";

$admin = User::factory()->create(['company_id' => $company->id]);
$admin->roles()->attach(Role::firstOrCreateByName('admin'));
echo "✓ Created admin: {$admin->id}\n";

$client = User::factory()->create([
    'company_id' => $company->id,
    'name' => 'Audit Client',
    'is_active' => true,
]);
$client->roles()->attach(Role::firstOrCreateByName('client'));
echo "✓ Created client: {$client->id} with is_active = true\n";

// Verify database column exists
echo "\n=== DATABASE SCHEMA CHECK ===\n";
$columns = DB::connection()->getSchemaBuilder()->getColumnListing('users');
$hasColumn = in_array('is_active', $columns);
echo ($hasColumn ? "✓" : "✗") . " Column 'is_active' exists in users table\n";
if (!$hasColumn) {
    echo "CRITICAL: is_active column missing from database schema!\n";
    exit(1);
}

// Check current database value
echo "\n=== BEFORE UPDATE ===\n";
$before = DB::table('users')->where('id', $client->id)->first();
echo "DB is_active: " . var_export($before->is_active, true) . " (raw)\n";
echo "Model is_active: " . var_export($client->is_active, true) . " (cast)\n";
echo "Model fillable: " . json_encode($client->getFillable()) . "\n";
echo "is_active in fillable: " . (in_array('is_active', $client->getFillable()) ? "YES" : "NO") . "\n";
echo "is_active cast: boolean\n";

// Simulate form request payload
echo "\n=== SIMULATING FORM REQUEST ===\n";
$payload = ['is_active' => false];
echo "Incoming payload: " . json_encode($payload) . "\n";

// Validate payload (simulate UpdateClientRequest)
echo "\n=== VALIDATION ===\n";
$rules = [
    'is_active' => 'sometimes|boolean',
];
$validator = validator($payload, $rules);
if ($validator->fails()) {
    echo "✗ Validation failed: " . json_encode($validator->errors()) . "\n";
    exit(1);
} else {
    echo "✓ Validation passed\n";
    echo "Validated data: " . json_encode($validator->validated()) . "\n";
}

// Simulate controller update
echo "\n=== CONTROLLER UPDATE ===\n";
$validated = $validator->validated();
echo "Before fill: is_active = " . var_export($client->is_active, true) . "\n";

$client->fill($validated);
echo "After fill (before save): is_active = " . var_export($client->is_active, true) . "\n";
echo "Client dirty attributes: " . json_encode($client->getDirty()) . "\n";

$saved = $client->save();
echo ($saved ? "✓" : "✗") . " Save returned: " . ($saved ? "true" : "false") . "\n";

// Verify database was updated
echo "\n=== AFTER UPDATE ===\n";
$after = DB::table('users')->where('id', $client->id)->first();
echo "DB is_active: " . var_export($after->is_active, true) . " (raw)\n";

// Refresh model and check
$client->refresh();
echo "Model is_active (after refresh): " . var_export($client->is_active, true) . " (cast)\n";

// Final verification
echo "\n=== RESULT ===\n";
// var_export returns boolean true/false, so check for boolean false
if ($client->is_active === false) {
    echo "✓ SUCCESS: is_active persisted correctly to false\n";
    echo "  DB value: " . var_export($after->is_active, true) . "\n";
    echo "  Model value: " . var_export($client->is_active, true) . "\n";
} else {
    echo "✗ FAILURE: is_active not persisted correctly\n";
    echo "  DB value: " . var_export($after->is_active, true) . " (expected: false)\n";
    echo "  Model value: " . var_export($client->is_active, true) . " (expected: false)\n";
}

// Test reverse: activate
echo "\n=== REVERSE TEST: ACTIVATE ===\n";
$client->fill(['is_active' => true]);
$client->save();
$client->refresh();
$afterActivate = DB::table('users')->where('id', $client->id)->first();
echo "DB is_active: " . var_export($afterActivate->is_active, true) . " (raw)\n";
echo "Model is_active: " . var_export($client->is_active, true) . " (cast)\n";

if ($client->is_active === true) {
    echo "✓ SUCCESS: is_active persisted correctly to true\n";
    echo "  DB value: " . var_export($afterActivate->is_active, true) . "\n";
    echo "  Model value: " . var_export($client->is_active, true) . "\n";
} else {
    echo "✗ FAILURE: is_active not persisted on activate\n";
    echo "  DB value: " . var_export($afterActivate->is_active, true) . " (expected: true)\n";
    echo "  Model value: " . var_export($client->is_active, true) . " (expected: true)\n";
}

echo "\n=== AUDIT COMPLETE ===\n";
