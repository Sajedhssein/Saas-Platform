<?php

namespace Tests\Feature\Admin;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
        ]);

        $adminRole = Role::factory()->create(['name' => 'admin']);
        $this->admin->roles()->attach($adminRole);

        $this->client = $this->createClient('Project Client', 'project-client@test.com');
    }

    public function test_admin_can_create_project()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'Website Redesign',
                'description' => 'Redesign the marketing website.',
                'status' => 'active',
                'start_date' => '2026-05-20',
                'end_date' => '2026-06-20',
                'progress' => 10,
                'budget' => 12000,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Project created successfully.',
            ])
            ->assertJsonPath('data.name', 'Website Redesign');

        $this->assertDatabaseHas('projects', [
            'name' => 'Website Redesign',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_admin_can_create_project_with_client()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'Client Owned Project',
                'description' => 'Assigned to a client.',
                'status' => 'active',
                'client_id' => $this->client->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.client.id', $this->client->id)
            ->assertJsonPath('data.client.name', 'Project Client');

        $this->assertDatabaseHas('projects', [
            'name' => 'Client Owned Project',
            'client_id' => $this->client->id,
        ]);
    }

    public function test_admin_can_create_project_with_employees()
    {
        $employeeOne = $this->createEmployee('Employee One', 'employee-one@test.com');
        $employeeTwo = $this->createEmployee('Employee Two', 'employee-two@test.com');

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'Team Project',
                'description' => 'Assigned to employees.',
                'status' => 'active',
                'employee_ids' => [$employeeOne->id, $employeeTwo->id],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.employees.0.id', $employeeOne->id)
            ->assertJsonPath('data.employees.1.id', $employeeTwo->id);

        $projectId = $response->json('data.id');

        $this->assertSame(2, DB::table('project_users')->where('project_id', $projectId)->count());
    }

    public function test_admin_can_update_project_client()
    {
        $replacementClient = $this->createClient('Replacement Client', 'replacement-client@test.com');

        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'client_id' => $this->client->id,
            'name' => 'Client Project',
            'description' => 'Project description.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 1000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/projects/{$project->id}", [
                'client_id' => $replacementClient->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.client.id', $replacementClient->id);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'client_id' => $replacementClient->id,
        ]);
    }

    public function test_admin_can_update_project_employees()
    {
        $employeeOne = $this->createEmployee('Employee One', 'employee-one-update@test.com');
        $employeeTwo = $this->createEmployee('Employee Two', 'employee-two-update@test.com');
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Employee Sync Project',
            'description' => 'Project description.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 1000,
        ]);

        $project->employees()->attach($employeeOne->id);

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/projects/{$project->id}", [
                'employee_ids' => [$employeeTwo->id],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.employees.0.id', $employeeTwo->id)
            ->assertJsonCount(1, 'data.employees');

        $this->assertSame(1, DB::table('project_users')->where('project_id', $project->id)->count());
        $this->assertDatabaseHas('project_users', [
            'project_id' => $project->id,
            'user_id' => $employeeTwo->id,
        ]);
        $this->assertDatabaseMissing('project_users', [
            'project_id' => $project->id,
            'user_id' => $employeeOne->id,
        ]);
    }

    public function test_nullable_client_id_is_allowed()
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'No Client Project',
                'description' => 'Project without a client.',
                'status' => 'pending',
                'client_id' => null,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.client', null);

        $this->assertDatabaseHas('projects', [
            'name' => 'No Client Project',
            'client_id' => null,
        ]);
    }

    public function test_deleting_client_nullifies_project_relation()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'client_id' => $this->client->id,
            'name' => 'Client Delete Project',
            'description' => 'Project tied to a client.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 10,
            'budget' => 1000,
        ]);

        $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/admin/users/{$this->client->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('users', ['id' => $this->client->id]);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'client_id' => null,
        ]);
    }

    public function test_company_isolation_blocks_cross_company_client_assignment()
    {
        $otherCompany = Company::factory()->create();
        $otherClient = User::factory()->create([
            'company_id' => $otherCompany->id,
        ]);
        $otherClient->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'Invalid Client Assignment',
                'client_id' => $otherClient->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('client_id');
    }

    public function test_company_isolation_blocks_cross_company_employee_assignment()
    {
        $otherCompany = Company::factory()->create();
        $otherEmployee = User::factory()->create([
            'company_id' => $otherCompany->id,
        ]);
        $otherEmployee->roles()->attach(Role::firstOrCreateByName('employee'));

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'Invalid Employee Assignment',
                'employee_ids' => [$otherEmployee->id],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('employee_ids.0');
    }

    public function test_admin_can_filter_projects_by_client_id()
    {
        $clientProject = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'client_id' => $this->client->id,
            'name' => 'Filtered Project',
            'description' => 'Should appear when filtered.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 10,
            'budget' => 1000,
        ]);

        Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Unfiltered Project',
            'description' => 'Should not appear.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 10,
            'budget' => 1000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/projects?client_id='.$this->client->id);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $clientProject->id);
    }

    public function test_admin_can_list_projects()
    {
        $projectA = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Project A',
            'description' => 'First project',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 20,
            'budget' => 10000,
        ]);

        Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Project B',
            'description' => 'Second project',
            'status' => 'active',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'progress' => 5,
            'budget' => 8000,
        ]);

        Task::create([
            'project_id' => $projectA->id,
            'created_by' => $this->admin->id,
            'title' => 'Task 1',
            'description' => 'Completed task 1',
            'status' => 'completed',
            'priority' => 'medium',
        ]);
        Task::create([
            'project_id' => $projectA->id,
            'created_by' => $this->admin->id,
            'title' => 'Task 2',
            'description' => 'Completed task 2',
            'status' => 'completed',
            'priority' => 'medium',
        ]);
        Task::create([
            'project_id' => $projectA->id,
            'created_by' => $this->admin->id,
            'title' => 'Task 3',
            'description' => 'Pending task',
            'status' => 'pending',
            'priority' => 'medium',
        ]);
        Task::create([
            'project_id' => $projectA->id,
            'created_by' => $this->admin->id,
            'title' => 'Task 4',
            'description' => 'In progress task',
            'status' => 'in_progress',
            'priority' => 'medium',
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/projects');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['total_tasks', 'completed_tasks', 'progress'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $listedProjectA = collect($response->json('data'))
            ->firstWhere('id', $projectA->id);

        $this->assertNotNull($listedProjectA);
        $this->assertSame(4, $listedProjectA['total_tasks']);
        $this->assertSame(2, $listedProjectA['completed_tasks']);
        $this->assertSame(63, $listedProjectA['progress']);
    }

    public function test_admin_can_view_project_details()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Project Details',
            'description' => 'Project description.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 40,
            'budget' => 20000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/admin/projects/{$project->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.name', 'Project Details')
            ->assertJsonPath('data.total_tasks', 0)
            ->assertJsonPath('data.completed_tasks', 0)
            ->assertJsonPath('data.progress', 0);
    }

    public function test_duplicate_employee_ids_are_not_saved_twice()
    {
        $employee = $this->createEmployee('Duplicate Employee', 'duplicate-employee@test.com');

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/projects', [
                'name' => 'Duplicate Safe Project',
                'employee_ids' => [$employee->id, $employee->id],
            ]);

        $response->assertStatus(201)
            ->assertJsonCount(1, 'data.employees');

        $projectId = $response->json('data.id');

        $this->assertSame(1, DB::table('project_users')->where('project_id', $projectId)->count());
    }

    public function test_admin_can_view_project_with_all_completed_tasks()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Completed Project',
            'description' => 'Project with completed tasks.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 20000,
        ]);

        Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Done 1',
            'description' => 'Done task 1',
            'status' => 'completed',
            'priority' => 'medium',
        ]);

        Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Done 2',
            'description' => 'Done task 2',
            'status' => 'completed',
            'priority' => 'medium',
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/admin/projects/{$project->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.total_tasks', 2)
            ->assertJsonPath('data.completed_tasks', 2)
            ->assertJsonPath('data.progress', 100);
    }

    public function test_admin_can_update_project()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Initial Project',
            'description' => 'Initial description.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 10000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->putJson("/api/admin/projects/{$project->id}", [
                'name' => 'Updated Project',
                'progress' => 50,
                'budget' => 15000,
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('data.name', 'Updated Project')
            ->assertJsonPath('data.total_tasks', 0)
            ->assertJsonPath('data.completed_tasks', 0)
            ->assertJsonPath('data.progress', 0);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Updated Project',
            'progress' => 50,
        ]);
    }

    public function test_admin_can_delete_project()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Delete Project',
            'description' => 'This will be deleted.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/admin/projects/{$project->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Project deleted successfully.',
            ]);

        $this->assertSoftDeleted('projects', [
            'id' => $project->id,
        ]);
    }

    private function createClient(string $name, string $email): User
    {
        $client = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => $name,
            'email' => $email,
        ]);

        $client->roles()->attach(Role::firstOrCreateByName('client'));

        return $client;
    }

    private function createEmployee(string $name, string $email): User
    {
        $employee = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => $name,
            'email' => $email,
        ]);

        $employee->roles()->attach(Role::firstOrCreateByName('employee'));

        return $employee;
    }
}
