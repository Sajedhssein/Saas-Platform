<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $otherEmployee;
    private Company $company;
    private Project $project;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();

        // Create admin
        $this->admin = User::factory()->create(['company_id' => $this->company->id]);
        $adminRole = Role::factory()->create(['name' => 'admin']);
        $this->admin->roles()->attach($adminRole);

        // Create employees
        $this->employee = User::factory()->create(['company_id' => $this->company->id]);
        $this->otherEmployee = User::factory()->create(['company_id' => $this->company->id]);
        $employeeRole = Role::factory()->create(['name' => 'employee']);
        $this->employee->roles()->attach($employeeRole);
        $this->otherEmployee->roles()->attach($employeeRole);

        // Create project and task
        $this->project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Test Project',
            'description' => 'Test project',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 10000,
        ]);

        $this->task = Task::create([
            'project_id' => $this->project->id,
            'created_by' => $this->admin->id,
            'title' => 'Test Task',
            'description' => 'Test task',
            'status' => 'pending',
            'priority' => 'medium',
            'progress' => 0,
            'deadline' => '2026-06-15',
            'estimated_hours' => 5,
        ]);
    }

    /**
     * Test admin can view all activity logs
     */
    public function test_admin_can_view_all_activity_logs(): void
    {
        // Create some logs
        ActivityLogService::logTaskCreated($this->admin->id, $this->task->id, $this->task->toArray());
        ActivityLogService::logTaskStatusChanged($this->admin->id, $this->task->id, 'pending', 'in_progress');

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/activity-logs');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 2);

        $logs = $response->json('data');
        $this->assertCount(2, $logs);
    }

    /**
     * Test non-admin can only view logs for assigned tasks
     */
    public function test_non_admin_can_only_view_logs_for_assigned_tasks(): void
    {
        // Assign task to employee
        $this->task->users()->attach($this->employee->id, ['role' => 'assignee']);

        // Create logs
        ActivityLogService::logTaskAssigned($this->admin->id, $this->task->id, $this->employee->id, $this->employee->name);
        ActivityLogService::logTaskStatusChanged($this->admin->id, $this->task->id, 'pending', 'in_progress');

        $response = $this->actingAs($this->employee, 'api')
            ->getJson('/api/activity-logs');

        $response->assertStatus(200);
        $logs = $response->json('data');

        // Should see logs for assigned task
        $this->assertCount(2, $logs);
        $this->assertEquals($this->task->id, $logs[0]['entity_id']);
    }

    /**
     * Test get logs for specific task
     */
    public function test_get_logs_for_specific_task(): void
    {
        // Assign task to employee
        $this->task->users()->attach($this->employee->id, ['role' => 'assignee']);

        // Create logs
        ActivityLogService::logTaskAssigned($this->admin->id, $this->task->id, $this->employee->id, $this->employee->name);
        ActivityLogService::logTaskStatusChanged($this->admin->id, $this->task->id, 'pending', 'in_progress');

        $response = $this->actingAs($this->employee, 'api')
            ->getJson("/api/tasks/{$this->task->id}/activity-logs");

        $response->assertStatus(200)
            ->assertJsonPath('task_id', $this->task->id)
            ->assertJsonPath('pagination.total', 2);

        $logs = $response->json('data');
        $this->assertCount(2, $logs);
    }

    /**
     * Test unauthorized user cannot view task logs
     */
    public function test_unauthorized_user_cannot_view_task_logs(): void
    {
        // Don't assign task to otherEmployee
        ActivityLogService::logTaskAssigned($this->admin->id, $this->task->id, $this->employee->id, $this->employee->name);

        $response = $this->actingAs($this->otherEmployee, 'api')
            ->getJson("/api/tasks/{$this->task->id}/activity-logs");

        $response->assertStatus(403);
    }

    /**
     * Test task creation is logged
     */
    public function test_task_creation_is_logged(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/tasks', [
                'project_id' => $this->project->id,
                'title' => 'New Task',
                'description' => 'New task description',
                'priority' => 'high',
                'deadline' => '2026-06-20 12:00:00',
                'estimated_hours' => 10,
            ]);

        $response->assertStatus(201);
        $taskId = $response->json('data.id');

        // Check if activity log was created
        $log = ActivityLog::where('entity_id', $taskId)
            ->where('action', 'TASK_CREATED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->admin->id, $log->user_id);
        $this->assertEquals('Task', $log->entity_type);
    }

    /**
     * Test task status change is logged
     */
    public function test_task_status_change_is_logged(): void
    {
        $oldStatus = $this->task->status;

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/admin/tasks/{$this->task->id}/status", [
                'status' => 'in_progress',
            ]);

        $response->assertStatus(200);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'TASK_STATUS_CHANGED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('in_progress', $log->new_values['status']);
        $this->assertEquals($oldStatus, $log->old_values['status']);
    }

    /**
     * Test task assignment is logged
     */
    public function test_task_assignment_is_logged(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/tasks/{$this->task->id}/assign", [
                'assignees' => [
                    [
                        'id' => $this->employee->id,
                        'role' => 'assignee',
                    ],
                ],
            ]);

        $response->assertStatus(200);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'TASK_ASSIGNED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->employee->id, $log->new_values['assigned_to']);
    }

    /**
     * Test task unassignment is logged
     */
    public function test_task_unassignment_is_logged(): void
    {
        $this->task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/tasks/{$this->task->id}/assign", [
                'assignees' => [],
            ]);

        $response->assertStatus(200);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'task_unassigned')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->employee->name, $log->metadata['unassigned_user_name']);
    }

    /**
     * Test file upload is logged
     */
    public function test_file_upload_is_logged(): void
    {
        Storage::fake('azure');

        $file = \Illuminate\Http\UploadedFile::fake()->create('test.pdf', 1024);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/tasks/{$this->task->id}/files", [
                'file' => $file,
            ]);

        $response->assertStatus(201);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'FILE_UPLOADED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('test.pdf', $log->new_values['file_name']);
    }

    /**
     * Test file deletion is logged
     */
    public function test_file_deletion_is_logged(): void
    {
        Storage::fake(config('filesystems.default'));

        $file = \Illuminate\Http\UploadedFile::fake()->create('delete-me.pdf', 1024);

        $uploadResponse = $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/tasks/{$this->task->id}/files", [
                'file' => $file,
            ]);

        $uploadResponse->assertStatus(201);

        $taskFileId = $uploadResponse->json('data.id');

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/admin/tasks/{$this->task->id}/files/{$taskFileId}");

        $response->assertStatus(200);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'file_deleted')
            ->latest('created_at')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('delete-me.pdf', $log->metadata['file_name']);
    }

    /**
     * Test comment creation is logged
     */
    public function test_comment_creation_is_logged(): void
    {
        $this->task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->employee, 'api')
            ->postJson("/api/tasks/{$this->task->id}/comments", [
                'content' => 'This is a test comment',
            ]);

        $response->assertStatus(201);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'COMMENT_CREATED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->employee->id, $log->user_id);
    }

    /**
     * Test response submission is logged
     */
    public function test_response_submission_is_logged(): void
    {
        $this->task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->employee, 'api')
            ->postJson("/api/tasks/{$this->task->id}/responses", [
                'response' => 'Task completed',
            ]);

        $response->assertStatus(201);

        $log = ActivityLog::where('entity_id', $this->task->id)
            ->where('action', 'RESPONSE_SUBMITTED')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->employee->id, $log->user_id);
    }

    /**
     * Test logs are sorted by latest first
     */
    public function test_logs_are_sorted_by_latest_first(): void
    {
        $this->task->users()->attach($this->employee->id, ['role' => 'assignee']);

        // Create logs with slight delay
        ActivityLogService::logTaskCreated($this->admin->id, $this->task->id, $this->task->toArray());
        sleep(1);
        ActivityLogService::logTaskStatusChanged($this->admin->id, $this->task->id, 'pending', 'in_progress');

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/activity-logs');

        $response->assertStatus(200);
        $logs = $response->json('data');

        // Latest log should be first
        $this->assertEquals('TASK_STATUS_CHANGED', $logs[0]['action']);
        $this->assertEquals('TASK_CREATED', $logs[1]['action']);
    }

    /**
     * Test activity log pagination
     */
    public function test_activity_log_pagination(): void
    {
        // Create 25 logs
        for ($i = 0; $i < 25; $i++) {
            ActivityLogService::log(
                $this->admin->id,
                'TEST_ACTION_' . $i,
                "Test action $i",
                'Task',
                $this->task->id
            );
        }

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/activity-logs');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 25)
            ->assertJsonPath('pagination.per_page', 20)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.has_more', true);

        $this->assertCount(20, $response->json('data'));
    }

    /**
     * Test unauthenticated user cannot view logs
     */
    public function test_unauthenticated_user_cannot_view_logs(): void
    {
        $response = $this->getJson('/api/activity-logs');

        $response->assertStatus(401);
    }

    /**
     * Test activity log includes user information
     */
    public function test_activity_log_includes_user_information(): void
    {
        ActivityLogService::logTaskCreated($this->admin->id, $this->task->id, $this->task->toArray());

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/activity-logs');

        $response->assertStatus(200);
        $log = $response->json('data')[0];

        $this->assertArrayHasKey('user', $log);
        $this->assertEquals($this->admin->name, $log['user']['name']);
        $this->assertEquals($this->admin->email, $log['user']['email']);
    }
}
