<?php

namespace Tests\Feature\Admin;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        // Create company
        $this->company = Company::factory()->create();

        // Create admin user
        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $adminRole = Role::factory()->create(['name' => 'admin']);
        $this->admin->roles()->attach($adminRole);

        // Create employee user
        $this->employee = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $employeeRole = Role::factory()->create(['name' => 'employee']);
        $this->employee->roles()->attach($employeeRole);
    }

    public function test_create_employee()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/employees', [
                'name' => 'New Employee',
                'email' => 'newemployee@test.com',
                'password' => 'Password123',
                'phone' => '123-456-7890',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Employee created successfully.',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'newemployee@test.com',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_create_client()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/clients', [
                'name' => 'New Client',
                'email' => 'newclient@test.com',
                'password' => 'Password123',
                'company_name' => 'Client Corp',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Client created successfully.',
            ]);
    }

    public function test_show_client(): void
    {
        $client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Detail Client',
            'email' => 'detail-client@test.com',
            'phone' => '555-987-6543',
            'department' => 'Sales',
            'position' => 'Manager',
            'status' => 'active',
        ]);
        $client->roles()->attach(Role::firstOrCreateByName('client'));

        for ($index = 1; $index <= 6; $index++) {
            $project = \App\Models\Project::create([
                'company_id' => $this->company->id,
                'created_by' => $this->admin->id,
                'client_id' => $client->id,
                'name' => 'Client Project '.$index,
                'description' => 'Project '.$index,
                'status' => $index === 1 ? 'completed' : 'active',
                'start_date' => '2026-05-01',
                'end_date' => '2026-05-31',
                'progress' => $index * 10,
                'budget' => 1000,
            ]);

            \App\Models\Project::query()->whereKey($project->id)->update([
                'created_at' => \Carbon\Carbon::parse('2026-05-01 00:00:00')->addMinutes($index),
                'updated_at' => \Carbon\Carbon::parse('2026-05-01 00:00:00')->addMinutes($index),
            ]);
        }

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/clients/'.$client->id);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $client->id)
            ->assertJsonPath('data.name', 'Detail Client')
            ->assertJsonPath('data.email', 'detail-client@test.com')
            ->assertJsonPath('data.phone', '555-987-6543')
            ->assertJsonPath('data.department', 'Sales')
            ->assertJsonPath('data.position', 'Manager')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.role', 'client')
            ->assertJsonPath('data.projects_count', 6)
            ->assertJsonCount(5, 'data.latest_projects');

        $this->assertSame('Client Project 6', $response->json('data.latest_projects.0.name'));
        $this->assertSame('Client Project 2', $response->json('data.latest_projects.4.name'));
    }

    public function test_show_client_company_isolation(): void
    {
        $otherCompany = Company::factory()->create();
        $otherClient = User::factory()->create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Company Client',
            'email' => 'other-company-client@test.com',
        ]);
        $otherClient->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/clients/'.$otherClient->id);

        $response->assertStatus(404);
    }

    public function test_show_client_not_found_returns_404(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/clients/'.Str::uuid());

        $response->assertStatus(404);
    }

    public function test_show_employee_returns_employee_details(): void
    {
        $employee = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Employee Detail',
            'email' => 'employee-detail@test.com',
            'phone' => '555-123-4567',
            'department' => 'Support',
            'position' => 'Representative',
            'status' => 'active',
        ]);
        $employee->roles()->attach(Role::firstOrCreateByName('employee'));

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/employees/'.$employee->id);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $employee->id,
                    'name' => 'Employee Detail',
                    'email' => 'employee-detail@test.com',
                    'phone' => '555-123-4567',
                    'department' => 'Support',
                    'position' => 'Representative',
                    'role' => 'employee',
                    'status' => 'active',
                ],
            ])
            ->assertJsonPath('data.created_at', $employee->created_at->toDateTimeString());
    }

    public function test_update_employee(): void
    {
        $employee = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Old Employee',
            'email' => 'old-employee@test.com',
            'phone' => '123-123-1234',
            'department' => 'Support',
            'position' => 'Representative',
            'status' => 'active',
        ]);
        $employee->roles()->attach(Role::firstOrCreateByName('employee'));

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/employees/{$employee->id}", [
                'name' => 'Updated Employee',
                'phone' => '777-777-7777',
                'department' => 'Marketing',
                'position' => 'Lead',
                'status' => 'inactive',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Employee')
            ->assertJsonPath('data.phone', '777-777-7777')
            ->assertJsonPath('data.department', 'Marketing')
            ->assertJsonPath('data.position', 'Lead')
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseHas('users', [
            'id' => $employee->id,
            'name' => 'Updated Employee',
            'phone' => '777-777-7777',
            'department' => 'Marketing',
            'position' => 'Lead',
            'status' => 'inactive',
        ]);
    }

    public function test_show_employee_company_isolation_returns_404(): void
    {
        $otherCompany = Company::factory()->create();
        $otherEmployee = User::factory()->create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Employee',
            'email' => 'other-employee@test.com',
        ]);
        $otherEmployee->roles()->attach(Role::firstOrCreateByName('employee'));

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/employees/'.$otherEmployee->id);

        $response->assertStatus(404);
    }

    public function test_update_client_returns_updated_client(): void
    {
        $client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Original Client',
            'email' => 'original-client@test.com',
            'phone' => '111-111-1111',
        ]);
        $client->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/clients/{$client->id}", [
                'name' => 'Updated Client',
                'email' => 'updated-client@test.com',
                'phone' => '222-222-2222',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Client updated successfully.',
                'data' => [
                    'id' => $client->id,
                    'name' => 'Updated Client',
                    'email' => 'updated-client@test.com',
                    'phone' => '222-222-2222',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $client->id,
            'name' => 'Updated Client',
            'email' => 'updated-client@test.com',
            'phone' => '222-222-2222',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_activate_client(): void
    {
        $client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Inactive Client',
            'email' => 'inactive-client@test.com',
            'is_active' => false,
        ]);
        $client->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/clients/{$client->id}", [
                'is_active' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('users', [
            'id' => $client->id,
            'is_active' => true,
        ]);
    }

    public function test_deactivate_client(): void
    {
        $client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Active Client',
            'email' => 'active-client@test.com',
            'is_active' => true,
        ]);
        $client->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/clients/{$client->id}", [
                'is_active' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('users', [
            'id' => $client->id,
            'is_active' => false,
        ]);
    }

    public function test_update_client_company_isolation_returns_404(): void
    {
        $otherCompany = Company::factory()->create();
        $otherClient = User::factory()->create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Client',
            'email' => 'other-client@test.com',
        ]);
        $otherClient->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/clients/{$otherClient->id}", [
                'name' => 'Blocked Update',
            ]);

        $response->assertStatus(404);
    }

    public function test_list_employees()
    {
            $employeeRole = Role::firstWhere('name', 'employee') ?? Role::factory()->create(['name' => 'employee']);

            $employee = User::factory()->create([
                'company_id' => $this->company->id,
                'name' => 'Listed Employee',
                'email' => 'listed-employee@test.com',
            ]);
            $employee->roles()->attach($employeeRole);

            $otherCompany = Company::factory()->create();
            $otherEmployee = User::factory()->create([
                'company_id' => $otherCompany->id,
                'name' => 'Other Employee',
                'email' => 'other-employee@test.com',
            ]);
            $otherEmployee->roles()->attach($employeeRole);

            $response = $this->actingAs($this->admin, 'api')
                ->getJson('/api/admin/employees');

            $response->assertStatus(200)
                ->assertJson(['success' => true])
                ->assertJsonStructure([
                    'data',
                    'meta' => ['current_page', 'last_page', 'per_page', 'total'],
                ])
                ->assertJsonPath('meta.per_page', 15)
                ->assertJsonPath('meta.total', 2)
                ->assertJsonCount(2, 'data');

            $this->assertTrue(collect($response->json('data'))
                ->contains(fn ($employee) => $employee['email'] === 'listed-employee@test.com' && $employee['role'] === 'employee'));

            $this->assertFalse(collect($response->json('data'))
                ->contains(fn ($employee) => $employee['email'] === 'other-employee@test.com'));
        }

        public function test_list_clients()
        {
            $clientRole = Role::firstWhere('name', 'client') ?? Role::factory()->create(['name' => 'client']);

            $client = User::factory()->create([
                'company_id' => $this->company->id,
                'name' => 'Listed Client',
                'email' => 'listed-client@test.com',
            ]);
            $client->roles()->attach($clientRole);

            $otherCompany = Company::factory()->create();
            $otherClient = User::factory()->create([
                'company_id' => $otherCompany->id,
                'name' => 'Other Client',
                'email' => 'other-client@test.com',
            ]);
            $otherClient->roles()->attach($clientRole);

            $response = $this->actingAs($this->admin, 'api')
                ->getJson('/api/admin/clients');

            $response->assertStatus(200)
                ->assertJson(['success' => true])
                ->assertJsonStructure([
                    'data',
                    'meta' => ['current_page', 'last_page', 'per_page', 'total'],
                ])
                ->assertJsonPath('meta.per_page', 15)
                ->assertJsonPath('meta.total', 1)
                ->assertJsonPath('data.0.name', 'Listed Client')
                ->assertJsonPath('data.0.email', 'listed-client@test.com')
                    ->assertJsonPath('data.0.company_name', $this->company->name)
                    ->assertJsonPath('data.0.projects_count', 0);
        }

    public function test_list_users()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/users');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_filter_users_by_status()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/users?status=active');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_filter_users_by_role()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/users?role=employee');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_get_user_details()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/admin/users/{$this->employee->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.email', $this->employee->email);
    }

    public function test_assign_roles()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/users/{$this->employee->id}/roles", [
                'roles' => ['employee', 'client'],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'User roles updated successfully.',
            ]);
    }

    public function test_cannot_assign_super_admin()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/users/{$this->employee->id}/roles", [
                'roles' => ['super_admin'],
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Cannot assign super_admin role.',
            ]);
    }

    public function test_deactivate_user()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/admin/users/{$this->employee->id}/deactivate");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'User deactivated successfully.',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $this->employee->id,
            'status' => 'inactive',
        ]);
    }

    public function test_cannot_deactivate_self()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/admin/users/{$this->admin->id}/deactivate");

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Cannot deactivate yourself.',
            ]);
    }

    public function test_activate_user()
    {
        $this->employee->update(['status' => 'inactive']);

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/admin/users/{$this->employee->id}/activate");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'User activated successfully.',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $this->employee->id,
            'status' => 'active',
        ]);
    }

    public function test_employee_cannot_access_admin_routes()
    {
        $response = $this->actingAs($this->employee, 'api')
            ->getJson('/api/admin/users');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Forbidden.',
            ]);
    }

        public function test_employee_cannot_access_employee_list()
        {
            $response = $this->actingAs($this->employee, 'api')
                ->getJson('/api/admin/employees');

            $response->assertStatus(403)
                ->assertJson([
                    'success' => false,
                    'message' => 'Forbidden.',
                ]);
        }

    public function test_admin_cannot_access_other_company_users()
    {
        $otherCompany = Company::factory()->create();
        $otherUser = User::factory()->create(['company_id' => $otherCompany->id]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/admin/users/{$otherUser->id}");

        $response->assertStatus(404);
    }
}
