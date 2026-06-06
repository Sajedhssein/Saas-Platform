<?php

namespace Tests\Feature\Employee;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeAccessTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Company $otherCompany;
    private User $admin;
    private User $employee;
    private User $otherCompanyEmployee;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create([
            'name' => 'Primary Company',
        ]);

        $this->otherCompany = Company::factory()->create([
            'name' => 'Other Company',
        ]);

        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');
        $clientRole = Role::firstOrCreateByName('client');

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Admin User',
            'email' => 'admin@primary.test',
        ]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Primary Employee',
            'email' => 'employee@primary.test',
        ]);
        $this->employee->roles()->attach($employeeRole);

        $this->otherCompanyEmployee = User::factory()->create([
            'company_id' => $this->otherCompany->id,
            'name' => 'Other Employee',
            'email' => 'employee@other.test',
        ]);
        $this->otherCompanyEmployee->roles()->attach($employeeRole);

        $this->client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Client User',
            'email' => 'client@primary.test',
        ]);
        $this->client->roles()->attach($clientRole);
    }

    public function test_employee_sees_only_own_projects(): void
    {
        $assignedProject = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Assigned Project',
        ]);
        $assignedProject->users()->attach($this->employee->id, ['role' => 'assignee']);

        $unassignedProject = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Unassigned Project',
        ]);
        $unassignedProject->users()->attach($this->admin->id, ['role' => 'assignee']);

        $otherCompanyProject = Project::factory()->create([
            'company_id' => $this->otherCompany->id,
            'created_by' => $this->admin->id,
            'name' => 'Other Company Project',
        ]);
        $otherCompanyProject->users()->attach($this->otherCompanyEmployee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->employee, 'api')
            ->getJson('/api/employee/projects');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data');

        $this->assertSame('Assigned Project', $response->json('data.0.name'));
        $this->assertFalse(collect($response->json('data'))
            ->contains(fn (array $project) => $project['name'] === 'Unassigned Project'));
        $this->assertFalse(collect($response->json('data'))
            ->contains(fn (array $project) => $project['name'] === 'Other Company Project'));
    }

    public function test_employee_sees_only_own_tasks(): void
    {
        $project = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Primary Project',
        ]);

        $employeeTask = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Employee Task',
            'status' => 'in_progress',
            'priority' => 'high',
            'deadline' => now()->addDays(2),
        ]);
        $employeeTask->users()->attach($this->employee->id, ['role' => 'assignee']);

        $otherEmployeeTask = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Other Employee Task',
            'status' => 'pending',
            'priority' => 'low',
            'deadline' => now()->addDays(5),
        ]);
        $otherEmployeeTask->users()->attach($this->admin->id, ['role' => 'assignee']);

        $otherCompanyProject = Project::factory()->create([
            'company_id' => $this->otherCompany->id,
            'created_by' => $this->admin->id,
            'name' => 'Other Company Project',
        ]);
        $otherCompanyTask = Task::factory()->create([
            'project_id' => $otherCompanyProject->id,
            'created_by' => $this->admin->id,
            'title' => 'Other Company Task',
            'status' => 'completed',
            'priority' => 'medium',
            'deadline' => now()->addDay(),
        ]);
        $otherCompanyTask->users()->attach($this->otherCompanyEmployee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->employee, 'api')
            ->getJson('/api/employee/tasks');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data');

        $this->assertSame('Employee Task', $response->json('data.0.title'));
        $this->assertSame('Primary Project', $response->json('data.0.project.name'));
        $this->assertSame('in_progress', $response->json('data.0.status'));
        $this->assertSame('high', $response->json('data.0.priority'));
        $this->assertFalse(collect($response->json('data'))
            ->contains(fn (array $task) => $task['title'] === 'Other Employee Task'));
        $this->assertFalse(collect($response->json('data'))
            ->contains(fn (array $task) => $task['title'] === 'Other Company Task'));
    }

    public function test_employee_cannot_access_admin_routes(): void
    {
        $this->actingAs($this->employee, 'api')
            ->getJson('/api/admin/projects')
            ->assertStatus(403);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/dashboard/stats')
            ->assertStatus(403);
    }

    public function test_unauthorized_user_cannot_access_employee_endpoints(): void
    {
        $this->getJson('/api/employee/projects')
            ->assertStatus(401);

        $this->getJson('/api/employee/tasks')
            ->assertStatus(401);
    }
}
