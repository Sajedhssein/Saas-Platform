<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Invite;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ActivityNotificationFlowTest extends TestCase
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
    }

    private function createProject(array $attributes = []): Project
    {
        return Project::create(array_merge([
            'company_id' => $this->company->id,
            'created_by' => $attributes['created_by'] ?? $this->admin->id,
            'name' => 'CRM Dashboard',
            'description' => 'Project description',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-30',
            'progress' => 0,
            'budget' => 5000,
        ], $attributes));
    }

    private function createTask(Project $project, array $attributes = []): Task
    {
        return Task::create(array_merge([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Dashboard UI',
            'description' => 'Task description',
            'status' => 'pending',
            'priority' => 'medium',
            'deadline' => now()->addDays(3),
        ], $attributes));
    }

    public function test_task_assignment_creates_notification_and_activity_log(): void
    {
        $project = $this->createProject();
        $task = $this->createTask($project);

        $response = $this->actingAs($this->admin, 'api')->postJson('/api/admin/tasks/'.$task->id.'/assign', [
            'assignees' => [
                ['id' => $this->employee->id, 'role' => 'assignee'],
            ],
        ]);

        $response->assertStatus(200);

        $notification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('user_id', $this->employee->id)
            ->where('type', 'task_assigned')
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame($task->id, $notification->entity_id);
    }

    public function test_task_completion_creates_notification_and_timeline_entry(): void
    {
        $otherAdmin = User::factory()->create(['company_id' => $this->company->id]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $project = $this->createProject(['created_by' => $otherAdmin->id]);
        $task = $this->createTask($project);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->admin, 'api')->patchJson('/api/admin/tasks/'.$task->id.'/status', [
            'status' => 'completed',
        ]);

        $response->assertStatus(200);

        $notification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('type', 'task_completed')
            ->where('user_id', $otherAdmin->id)
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame($task->id, $notification->entity_id);

        $activityLog = ActivityLog::query()
            ->where('company_id', $this->company->id)
            ->where('task_id', $task->id)
            ->where('action', 'task_completed')
            ->first();

        $this->assertNotNull($activityLog);
        $this->assertSame('task_completed', $activityLog->action);
    }

    public function test_comment_and_file_upload_create_notifications(): void
    {
        $project = $this->createProject();
        $task = $this->createTask($project);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $commentResponse = $this->actingAs($this->employee, 'api')->postJson('/api/tasks/'.$task->id.'/comments', [
            'content' => 'Looks good',
        ]);

        $commentResponse->assertStatus(201);

        $commentNotification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('type', 'comment_added')
            ->first();

        $this->assertNotNull($commentNotification);
        $this->assertSame($task->id, $commentNotification->entity_id);

        Storage::fake('azure');
        $fileResponse = $this->actingAs($this->admin, 'api')->post('/api/admin/tasks/'.$task->id.'/files', [
            'file' => UploadedFile::fake()->create('design.pdf', 128, 'application/pdf'),
        ]);

        $fileResponse->assertStatus(201);

        $fileNotification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('type', 'file_uploaded')
            ->first();

        $this->assertNotNull($fileNotification);
        $this->assertSame($task->id, $fileNotification->entity_id);
    }

    public function test_invite_acceptance_creates_notification_and_activity_log(): void
    {
        $invite = Invite::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'email' => 'client@test.com',
            'role' => 'client',
            'token_hash' => sha1('invite-token'),
            'expires_at' => now()->addDays(7),
            'revoked' => false,
            'is_hidden' => false,
        ]);

        $response = $this->postJson('/api/auth/invite/accept', [
            'invite_id' => $invite->public_id,
            'first_name' => 'Client',
            'last_name' => 'User',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201);

        $notification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('user_id', $this->admin->id)
            ->where('type', 'invite_accepted')
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame($invite->id, $notification->entity_id);

        $activityLog = ActivityLog::query()
            ->where('company_id', $this->company->id)
            ->where('action', 'invite_accepted')
            ->first();

        $this->assertNotNull($activityLog);
    }

    public function test_project_and_report_generation_create_logs_and_notifications(): void
    {
        $projectResponse = $this->actingAs($this->admin, 'api')->postJson('/api/admin/projects', [
            'name' => 'Sales Portal',
            'description' => 'Project description',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'budget' => 10000,
        ]);

        $projectResponse->assertStatus(201);
        $projectId = $projectResponse->json('data.id');

        $projectNotification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('user_id', $this->admin->id)
            ->where('type', 'project')
            ->where('entity_id', $projectId)
            ->first();

        $this->assertNotNull($projectNotification);

        $this->actingAs($this->admin, 'api')->putJson('/api/admin/projects/'.$projectId, [
            'name' => 'Sales Portal',
            'description' => 'Project description',
            'status' => 'completed',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'budget' => 10000,
        ])->assertStatus(200);

        $completedLog = ActivityLog::query()
            ->where('company_id', $this->company->id)
            ->where('action', 'project_completed')
            ->first();

        $this->assertNotNull($completedLog);

        $reportResponse = $this->actingAs($this->admin, 'api')->postJson('/api/admin/reports/generate', [
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Monthly Summary',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $reportResponse->assertStatus(201);
        $reportId = $reportResponse->json('data.id');

        $reportNotification = Notification::query()
            ->where('company_id', $this->company->id)
            ->where('user_id', $this->admin->id)
            ->where('type', 'report_generated')
            ->where('entity_id', $reportId)
            ->first();

        $this->assertNotNull($reportNotification);

        $reportLog = ActivityLog::query()
            ->where('company_id', $this->company->id)
            ->where('action', 'report_generated')
            ->first();

        $this->assertNotNull($reportLog);
    }
}
