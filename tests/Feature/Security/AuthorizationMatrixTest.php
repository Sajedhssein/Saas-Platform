<?php

namespace Tests\Feature\Security;

use App\Models\Company;
use App\Models\Invite;
use App\Models\Project;
use App\Models\Report;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationMatrixTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;
    private User $employee;
    private User $client;
    private User $otherAdmin;
    private Company $otherCompany;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->otherCompany = Company::factory()->create();

        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');
        $clientRole = Role::firstOrCreateByName('client');

        $this->admin = User::factory()->create(['company_id' => $this->company->id]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create(['company_id' => $this->company->id]);
        $this->employee->roles()->attach($employeeRole);

        $this->client = User::factory()->create(['company_id' => $this->company->id]);
        $this->client->roles()->attach($clientRole);

        $this->otherAdmin = User::factory()->create(['company_id' => $this->otherCompany->id]);
        $this->otherAdmin->roles()->attach($adminRole);
    }

    public function test_employee_and_client_are_blocked_from_admin_routes(): void
    {
        $this->actingAs($this->employee, 'api')
            ->getJson('/api/admin/employees')
            ->assertStatus(403);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/admin/clients')
            ->assertStatus(403);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/admin/invites')
            ->assertStatus(403);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/admin/reports')
            ->assertStatus(403);
    }

    public function test_cross_company_task_access_is_blocked(): void
    {
        $project = Project::factory()->create([
            'company_id' => $this->otherCompany->id,
            'created_by' => $this->otherAdmin->id,
        ]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->otherAdmin->id,
        ]);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/tasks/' . $task->id)
            ->assertStatus(404);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/tasks/' . $task->id . '/comments')
            ->assertStatus(404);
    }

    public function test_assigned_employee_can_access_task_but_unassigned_employee_cannot(): void
    {
        $project = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
        ]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
        ]);

        $task->users()->attach($this->employee->id);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/tasks/' . $task->id)
            ->assertStatus(200);

        $otherEmployee = User::factory()->create(['company_id' => $this->company->id]);
        $otherEmployee->roles()->attach(Role::firstOrCreateByName('employee'));

        $this->actingAs($otherEmployee, 'api')
            ->getJson('/api/tasks/' . $task->id)
            ->assertStatus(403);
    }

    public function test_client_project_and_task_access_is_limited_to_assigned_projects(): void
    {
        $project = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
        ]);
        $project->users()->attach($this->client->id);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/client/projects')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->client, 'api')
            ->getJson('/api/client/projects/' . $project->id)
            ->assertStatus(200);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/tasks/' . $task->id)
            ->assertStatus(200);
    }

    public function test_report_access_is_limited_to_shared_reports(): void
    {
        $sharedReport = Report::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'report_type' => 'weekly',
            'format' => 'pdf',
            'title' => 'Shared Report',
            'status' => 'generated',
            'recipient_email' => $this->client->email,
            'generated_at' => now(),
        ]);

        $privateReport = Report::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'report_type' => 'weekly',
            'format' => 'pdf',
            'title' => 'Private Report',
            'status' => 'generated',
            'recipient_email' => 'other@example.com',
            'generated_at' => now(),
        ]);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/client/reports')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $sharedReport->id);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/client/reports/' . $sharedReport->id)
            ->assertStatus(200);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/client/reports/' . $privateReport->id)
            ->assertStatus(404);
    }

    public function test_invite_access_is_admin_only(): void
    {
        $invite = Invite::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'email' => 'invitee@test.com',
            'role' => 'client',
            'token_hash' => sha1(fake()->uuid()),
            'expires_at' => now()->addDays(7),
            'revoked' => false,
            'is_hidden' => false,
            'resent_count' => 0,
        ]);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/admin/invites/stats')
            ->assertStatus(403);

        $this->actingAs($this->client, 'api')
            ->postJson('/api/admin/invites/' . $invite->public_id . '/resend')
            ->assertStatus(403);
    }

    public function test_notification_isolation_and_clear_scope(): void
    {
        $this->admin->notifications()->create([
            'title' => 'Admin Notice',
            'message' => 'Admin only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->client->notifications()->create([
            'title' => 'Client Notice',
            'message' => 'Client only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->actingAs($this->client, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->client, 'api')
            ->patchJson('/api/notifications/clear')
            ->assertStatus(200);

        $this->assertTrue($this->client->notifications()->first()->fresh()->is_hidden);
        $this->assertFalse($this->admin->notifications()->first()->fresh()->is_hidden);
    }
}
