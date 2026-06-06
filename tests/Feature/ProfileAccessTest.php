<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileAccessTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;
    private User $employee;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();

        // Create roles
        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');
        $clientRole = Role::firstOrCreateByName('client');

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Admin User',
            'status' => 'active',
        ]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Employee User',
            'status' => 'active',
        ]);
        $this->employee->roles()->attach($employeeRole);

        $this->client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Client User',
            'status' => 'active',
        ]);
        $this->client->roles()->attach($clientRole);
    }

    public function test_admin_can_access_profile()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/profile');

        $response->assertStatus(200)
            ->assertJsonPath('id', $this->admin->id)
            ->assertJsonPath('company_id', $this->company->id)
            ->assertJsonPath('name', 'Admin User')
            ->assertJsonPath('email', $this->admin->email)
            ->assertJsonPath('role', 'admin')
            ->assertJsonPath('phone', $this->admin->phone)
            ->assertJsonPath('department', $this->admin->department)
            ->assertJsonPath('position', $this->admin->position);
    }

    public function test_employee_can_access_profile()
    {
        $response = $this->actingAs($this->employee, 'api')
            ->getJson('/api/profile');

        $response->assertStatus(200)
            ->assertJsonPath('id', $this->employee->id)
            ->assertJsonPath('company_id', $this->company->id)
            ->assertJsonPath('name', 'Employee User')
            ->assertJsonPath('email', $this->employee->email)
            ->assertJsonPath('role', 'employee')
            ->assertJsonPath('phone', $this->employee->phone)
            ->assertJsonPath('department', $this->employee->department)
            ->assertJsonPath('position', $this->employee->position);
    }

    public function test_client_can_access_profile()
    {
        $response = $this->actingAs($this->client, 'api')
            ->getJson('/api/profile');

        $response->assertStatus(200)
            ->assertJsonPath('id', $this->client->id)
            ->assertJsonPath('company_id', $this->company->id)
            ->assertJsonPath('name', 'Client User')
            ->assertJsonPath('email', $this->client->email)
            ->assertJsonPath('role', 'client')
            ->assertJsonPath('phone', $this->client->phone)
            ->assertJsonPath('department', $this->client->department)
            ->assertJsonPath('position', $this->client->position);
    }

    public function test_inactive_user_cannot_access_profile()
    {
        $inactiveUser = User::factory()->create([
            'company_id' => $this->company->id,
            'status' => 'inactive',
        ]);
        $inactiveUser->roles()->attach(Role::firstOrCreateByName('admin'));

        $response = $this->actingAs($inactiveUser, 'api')
            ->getJson('/api/profile');

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Account inactive.');
    }

    public function test_unauthenticated_cannot_access_profile()
    {
        $response = $this->getJson('/api/profile');

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_client_can_update_profile()
    {
        $response = $this->actingAs($this->client, 'api')
            ->putJson('/api/profile', [
                'name' => 'Updated Client Name',
                'email' => $this->client->email,
                'phone' => '555-0123',
                'department' => 'Sales',
                'position' => 'Manager',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Updated Client Name')
            ->assertJsonPath('phone', '555-0123')
            ->assertJsonPath('department', 'Sales')
            ->assertJsonPath('position', 'Manager');

        $this->client->refresh();
        $this->assertEquals('Updated Client Name', $this->client->name);
        $this->assertEquals('555-0123', $this->client->phone);
    }
}
