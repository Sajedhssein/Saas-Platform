<?php

namespace Tests\Feature\Employee;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeDashboardTest extends TestCase
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

        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');
        $clientRole = Role::firstOrCreateByName('client');

        $this->admin = User::factory()->create(['company_id' => $this->company->id]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create(['company_id' => $this->company->id]);
        $this->employee->roles()->attach($employeeRole);

        $this->client = User::factory()->create(['company_id' => $this->company->id]);
        $this->client->roles()->attach($clientRole);

        $project = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Pending Task',
            'status' => 'pending',
            'deadline' => now()->addDays(3),
        ])->users()->attach($this->employee->id, ['role' => 'assignee']);

        Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Completed Task',
            'status' => 'completed',
            'deadline' => now()->subDay(),
        ])->users()->attach($this->employee->id, ['role' => 'assignee']);

        Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Overdue Task',
            'status' => 'in_progress',
            'deadline' => now()->subDay(),
        ])->users()->attach($this->employee->id, ['role' => 'assignee']);
    }

    public function test_admin_can_access_employee_dashboard(): void
    {
        $this->actingAs($this->admin, 'api')
            ->getJson('/api/employee/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.total_assigned_tasks', 0)
            ->assertJsonPath('data.summary.completed_tasks', 0)
            ->assertJsonPath('data.summary.in_progress_tasks', 0)
            ->assertJsonPath('data.summary.pending_tasks', 0);
    }

    public function test_employee_can_access_employee_dashboard(): void
    {
        $this->actingAs($this->employee, 'api')
            ->getJson('/api/employee/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.total_assigned_tasks', 3)
            ->assertJsonPath('data.summary.overdue_tasks', 1)
            ->assertJsonCount(3, 'data.recent_tasks');
    }

    public function test_client_cannot_access_employee_dashboard(): void
    {
        $this->actingAs($this->client, 'api')
            ->getJson('/api/employee/dashboard')
            ->assertStatus(403);
    }

    public function test_unauthorized_user_cannot_access_employee_dashboard(): void
    {
        $this->getJson('/api/employee/dashboard')
            ->assertStatus(401);
    }
}
