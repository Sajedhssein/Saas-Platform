<?php
/**
 * Test actual HTTP request to profile endpoint
 */

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Company;
use App\Models\User;
use App\Models\Role;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// Create a basic test case to use Laravel testing capabilities
$testCase = new class {
    use \Illuminate\Foundation\Testing\Concerns\MakesHttpRequests;
    use \Illuminate\Foundation\Testing\TestCase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function createApplication()
    {
        $app = require dirname(__DIR__) . '/bootstrap/app.php';
        $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
        return $app;
    }
};

echo "\n=== CLIENT PROFILE ENDPOINT TEST ===\n";

// Create test client
$company = Company::factory()->create(['name' => 'Test Company']);
$client = User::factory()->create([
    'company_id' => $company->id,
    'name' => 'Test Client',
    'email' => 'test-client@example.com',
    'status' => 'active',
]);
$client->roles()->attach(Role::firstOrCreateByName('client'));

echo "\n--- Created test client ---\n";
echo "Client ID: {$client->id}\n";
echo "Status: {$client->status}\n";
echo "Role: client\n";

// Generate JWT token
echo "\n--- Generating JWT token ---\n";
try {
    $token = \Tymon\JWTAuth\Facades\JWTAuth::fromUser($client);
    echo "✓ Token generated: " . substr($token, 0, 20) . "...\n";
} catch (\Exception $e) {
    echo "✗ Token generation failed: {$e->getMessage()}\n";
    exit(1);
}

// Test unauthorized access (no token)
echo "\n--- Test 1: GET /api/profile (no token) ---\n";
$response = \Http::get('http://localhost/api/profile');
echo "Status: {$response->status()}\n";
if ($response->status() === 401) {
    echo "✓ Correctly returned 401 Unauthorized\n";
} else {
    echo "✗ Expected 401, got {$response->status()}\n";
}

// Test authorized access (with token)
echo "\n--- Test 2: GET /api/profile (with valid token) ---\n";
$response = \Http::withToken($token)->get('http://localhost/api/profile');
echo "Status: {$response->status()}\n";
echo "Response: " . json_encode($response->json()) . "\n";

if ($response->status() === 200) {
    echo "✓ SUCCESS: Client can access profile\n";
    $data = $response->json();
    echo "  - Name: {$data['name']}\n";
    echo "  - Email: {$data['email']}\n";
} elseif ($response->status() === 403) {
    echo "✗ FORBIDDEN: Client cannot access profile\n";
    echo "  Response: " . $response->body() . "\n";
} else {
    echo "✗ Unexpected status: {$response->status()}\n";
}

echo "\n=== TEST COMPLETE ===\n";
