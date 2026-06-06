<?php

namespace Tests\Feature\Client;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClientProfileTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $client;
    private User $otherClient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();

        $clientRole = Role::firstOrCreateByName('client');

        $this->client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Test Client',
            'email' => 'client@example.com',
            'password' => Hash::make('CurrentPassword123!'),
            'phone' => '555-0123',
            'position' => 'Manager',
            'status' => 'active',
        ]);
        $this->client->roles()->attach($clientRole);

        $this->otherClient = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Other Client',
            'email' => 'other@example.com',
            'password' => Hash::make('OtherPassword123!'),
            'status' => 'active',
        ]);
        $this->otherClient->roles()->attach($clientRole);
    }

    public function test_client_can_view_own_profile()
    {
        $response = $this->actingAs($this->client, 'api')
            ->getJson('/api/client/profile');

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Test Client')
            ->assertJsonPath('email', 'client@example.com')
            ->assertJsonPath('phone', '555-0123')
            ->assertJsonPath('position', 'Manager')
            ->assertJsonPath('company.id', $this->company->id)
            ->assertJsonPath('company.name', $this->company->name);
    }

    public function test_client_can_update_profile()
    {
        $response = $this->actingAs($this->client, 'api')
            ->putJson('/api/client/profile', [
                'name' => 'Updated Client Name',
                'phone' => '555-9999',
                'position' => 'Senior Manager',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Updated Client Name')
            ->assertJsonPath('phone', '555-9999')
            ->assertJsonPath('position', 'Senior Manager');

        // Verify persistence after refresh
        $this->client->refresh();
        $this->assertEquals('Updated Client Name', $this->client->name);
        $this->assertEquals('555-9999', $this->client->phone);
        $this->assertEquals('Senior Manager', $this->client->position);
    }

    public function test_client_profile_update_validates_required_fields()
    {
        $response = $this->actingAs($this->client, 'api')
            ->putJson('/api/client/profile', [
                'phone' => '555-9999',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Name is required.');
    }

    public function test_client_profile_update_validates_field_lengths()
    {
        $response = $this->actingAs($this->client, 'api')
            ->putJson('/api/client/profile', [
                'name' => str_repeat('a', 256),
                'phone' => str_repeat('1', 31),
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Name cannot exceed 255 characters.')
            ->assertJsonPath('errors.phone.0', 'Phone cannot exceed 30 characters.');
    }

    public function test_client_can_update_password()
    {
        $response = $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'CurrentPassword123!',
                'new_password' => 'NewPassword456#',
                'new_password_confirmation' => 'NewPassword456#',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Password updated successfully.');

        // Verify password was actually changed
        $this->assertTrue(
            Hash::check('NewPassword456#', $this->client->fresh()->password)
        );
    }

    public function test_client_password_update_requires_current_password()
    {
        $response = $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'WrongPassword123!',
                'new_password' => 'NewPassword456#',
                'new_password_confirmation' => 'NewPassword456#',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.current_password.0', 'The current password is incorrect.');
    }

    public function test_client_password_update_validates_confirmation()
    {
        $response = $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'CurrentPassword123!',
                'new_password' => 'NewPassword456#',
                'new_password_confirmation' => 'DifferentPassword123!',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.new_password.0', 'Password confirmation does not match.');
    }

    public function test_client_password_update_validates_strength()
    {
        // Password too short
        $response = $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'CurrentPassword123!',
                'new_password' => 'short1!',
                'new_password_confirmation' => 'short1!',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.new_password', fn($errors) => count($errors) > 0);

        // Password without symbol
        $response = $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'CurrentPassword123!',
                'new_password' => 'NoSymbol12345',
                'new_password_confirmation' => 'NoSymbol12345',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.new_password', fn($errors) => count($errors) > 0);
    }

    public function test_client_cannot_set_new_password_same_as_current()
    {
        $response = $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'CurrentPassword123!',
                'new_password' => 'CurrentPassword123!',
                'new_password_confirmation' => 'CurrentPassword123!',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.new_password.0', 'The new password cannot be the same as the current password.');
    }

    public function test_unauthenticated_user_cannot_access_client_profile()
    {
        $response = $this->getJson('/api/client/profile');

        $response->assertStatus(401);
    }

    public function test_inactive_user_cannot_access_client_profile()
    {
        $inactiveClient = User::factory()->create([
            'company_id' => $this->company->id,
            'status' => 'inactive',
        ]);
        $inactiveClient->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($inactiveClient, 'api')
            ->getJson('/api/client/profile');

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Account inactive.');
    }

    public function test_non_client_users_cannot_access_client_profile()
    {
        $admin = User::factory()->create([
            'company_id' => $this->company->id,
            'status' => 'active',
        ]);
        $admin->roles()->attach(Role::firstOrCreateByName('admin'));

        $response = $this->actingAs($admin, 'api')
            ->getJson('/api/client/profile');

        $response->assertStatus(403);
    }

    public function test_client_can_update_profile_null_fields()
    {
        $response = $this->actingAs($this->client, 'api')
            ->putJson('/api/client/profile', [
                'name' => 'Updated Client',
                'phone' => null,
                'position' => null,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Updated Client')
            ->assertJsonPath('phone', null)
            ->assertJsonPath('position', null);
    }

    public function test_password_change_persists_after_logout_and_login()
    {
        // Update password
        $this->actingAs($this->client, 'api')
            ->patchJson('/api/client/password', [
                'current_password' => 'CurrentPassword123!',
                'new_password' => 'NewPassword456#',
                'new_password_confirmation' => 'NewPassword456#',
            ]);

        // Try to login with new password
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $this->client->email,
            'password' => 'NewPassword456#',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonPath('message', 'Authentication successful.');
    }

    public function test_profile_update_persists_after_page_refresh()
    {
        // Update profile
        $this->actingAs($this->client, 'api')
            ->putJson('/api/client/profile', [
                'name' => 'Updated Name',
                'phone' => '555-1234',
                'position' => 'New Position',
            ]);

        // Get profile again (simulating page refresh)
        $response = $this->actingAs($this->client, 'api')
            ->getJson('/api/client/profile');

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Updated Name')
            ->assertJsonPath('phone', '555-1234')
            ->assertJsonPath('position', 'New Position');
    }

    public function test_client_cannot_view_other_client_profile()
    {
        // This test verifies each client only sees their own profile
        $response = $this->actingAs($this->client, 'api')
            ->getJson('/api/client/profile');

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Test Client')
            ->assertJsonPath('email', 'client@example.com');

        // Verify they don't see other client data
        $this->assertNotEquals('Other Client', $response['name']);
    }
}
