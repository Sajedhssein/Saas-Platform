<?php

namespace Tests\Feature\Notifications;

use App\Events\CommentAdded;
use App\Events\FileUploaded;
use App\Events\ResponseSubmitted;
use App\Events\TaskAssigned;
use App\Events\TaskStatusChanged;
use App\Models\Company;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NotificationIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $admin;
    protected User $employee1;
    protected User $employee2;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        Event::fake();

        // Create company
        $this->company = Company::create([
            'name' => 'Test Company',
            'slug' => 'test-company',
        ]);

        // Create roles
        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');

        // Create users
        $this->admin = User::create([
            'company_id' => $this->company->id,
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);
        $this->admin->roles()->attach($adminRole);

        $this->employee1 = User::create([
            'company_id' => $this->company->id,
            'name' => 'Employee 1',
            'email' => 'employee1@test.com',
            'password' => bcrypt('password'),
        ]);
        $this->employee1->roles()->attach($employeeRole);

        $this->employee2 = User::create([
            'company_id' => $this->company->id,
            'name' => 'Employee 2',
            'email' => 'employee2@test.com',
            'password' => bcrypt('password'),
        ]);
        $this->employee2->roles()->attach($employeeRole);

        // Create project
        $project = $this->company->projects()->create([
            'name' => 'Test Project',
            'description' => 'Test description',
            'created_by' => $this->admin->id,
        ]);

        // Create task
        $this->task = $project->tasks()->create([
            'title' => 'Test Task',
            'description' => 'Test task description',
            'created_by' => $this->admin->id,
            'status' => 'pending',
        ]);
    }

    public function test_task_assignment_dispatches_event(): void
    {
        Event::assertNotDispatched(TaskAssigned::class);

        $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/tasks/' . $this->task->id . '/assign', [
                'assignees' => [
                    ['id' => $this->employee1->id, 'role' => 'developer'],
                ],
            ])
            ->assertStatus(200);

        Event::assertDispatched(TaskAssigned::class);
    }

    public function test_task_status_change_dispatches_event(): void
    {
        Event::assertNotDispatched(TaskStatusChanged::class);

        $this->actingAs($this->admin, 'api')
            ->patchJson('/api/admin/tasks/' . $this->task->id . '/status', [
                'status' => 'in_progress',
            ])
            ->assertStatus(200);

        Event::assertDispatched(TaskStatusChanged::class);
    }

    public function test_comment_added_dispatches_event(): void
    {
        Event::assertNotDispatched(CommentAdded::class);

        // Assign employee to task first
        $this->task->users()->attach($this->employee1->id);

        $this->actingAs($this->admin, 'api')
            ->postJson('/api/tasks/' . $this->task->id . '/comments', [
                'content' => 'This is a comment',
            ])
            ->assertStatus(201);

        Event::assertDispatched(CommentAdded::class);
    }

    public function test_response_submitted_dispatches_event(): void
    {
        Event::assertNotDispatched(ResponseSubmitted::class);

        // Assign employee to task
        $this->task->users()->attach($this->employee1->id);

        $this->actingAs($this->employee1, 'api')
            ->postJson('/api/tasks/' . $this->task->id . '/responses', [
                'response' => 'This is my response to the task',
            ])
            ->assertStatus(201);

        Event::assertDispatched(ResponseSubmitted::class);
    }

    public function test_file_upload_dispatches_event(): void
    {
        Event::assertNotDispatched(FileUploaded::class);

        Storage::fake('azure');
        $file = UploadedFile::fake()->create('test-file.pdf', 100, 'application/pdf');

        $this->actingAs($this->admin, 'api')
            ->post('/api/admin/tasks/' . $this->task->id . '/files', [
                'file' => $file,
            ])
            ->assertStatus(201);

        Event::assertDispatched(FileUploaded::class);
    }

    public function test_get_notifications_returns_paginated_list(): void
    {
        // Create some notifications manually for the employee
        $this->admin->notifications()->create([
            'title' => 'Test Notification 1',
            'message' => 'Test message 1',
            'type' => 'task_assigned',
            'data' => ['task_id' => $this->task->id],
        ]);

        $this->admin->notifications()->create([
            'title' => 'Test Notification 2',
            'message' => 'Test message 2',
            'type' => 'task_status_changed',
            'data' => ['task_id' => $this->task->id],
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'user_id',
                        'title',
                        'message',
                        'type',
                        'data',
                        'read_at',
                        'created_at',
                        'is_read',
                    ],
                ],
                'unread_count',
                'pagination' => [
                    'total',
                    'per_page',
                    'current_page',
                    'last_page',
                ],
            ]);

        $this->assertEquals(2, $response['pagination']['total']);
    }

    public function test_clear_notifications_hides_rows_and_keeps_new_ones_visible(): void
    {
        $first = $this->admin->notifications()->create([
            'title' => 'Old Notification 1',
            'message' => 'Old message 1',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $second = $this->admin->notifications()->create([
            'title' => 'Old Notification 2',
            'message' => 'Old message 2',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->actingAs($this->admin, 'api')
            ->patchJson('/api/notifications/clear')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Notifications cleared',
            ]);

        $this->assertTrue($first->fresh()->is_hidden);
        $this->assertTrue($second->fresh()->is_hidden);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertCount(0, $response->json('data'));

        $newNotification = $this->admin->notifications()->create([
            'title' => 'New Notification',
            'message' => 'New message',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $afterClear = $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertCount(1, $afterClear->json('data'));
        $this->assertEquals($newNotification->id, $afterClear->json('data.0.id'));
    }

    public function test_unread_count_updates_after_clear(): void
    {
        $this->admin->notifications()->create([
            'title' => 'Unread 1',
            'message' => 'Unread 1',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->admin->notifications()->create([
            'title' => 'Unread 2',
            'message' => 'Unread 2',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->actingAs($this->admin, 'api')
            ->patchJson('/api/notifications/clear')
            ->assertStatus(200);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(0, $response->json('unread_count'));
    }

    public function test_mark_single_notification_as_read(): void
    {
        $notification = $this->admin->notifications()->create([
            'title' => 'Test Notification',
            'message' => 'Test message',
            'type' => 'task_assigned',
            'data' => ['task_id' => $this->task->id],
        ]);

        $this->assertNull($notification->read_at);

        $this->actingAs($this->admin, 'api')
            ->patchJson('/api/notifications/' . $notification->id . '/read')
            ->assertStatus(200)
            ->assertJsonPath('data.is_read', true);

        $notification->refresh();
        $this->assertNotNull($notification->read_at);
    }

    public function test_mark_all_notifications_as_read(): void
    {
        $this->admin->notifications()->create([
            'title' => 'Test Notification 1',
            'message' => 'Test message 1',
            'type' => 'task_assigned',
            'data' => ['task_id' => $this->task->id],
        ]);

        $this->admin->notifications()->create([
            'title' => 'Test Notification 2',
            'message' => 'Test message 2',
            'type' => 'task_status_changed',
            'data' => ['task_id' => $this->task->id],
        ]);

        $this->actingAs($this->admin, 'api')
            ->patchJson('/api/notifications/read-all')
            ->assertStatus(200)
            ->assertJsonPath('updated_count', 2);

        $unreadCount = $this->admin->notifications()
            ->whereNull('read_at')
            ->count();

        $this->assertEquals(0, $unreadCount);
    }

    public function test_cannot_mark_another_users_notification_as_read(): void
    {
        $notification = $this->admin->notifications()->create([
            'title' => 'Test Notification',
            'message' => 'Test message',
            'type' => 'task_assigned',
            'data' => ['task_id' => $this->task->id],
        ]);

        $this->actingAs($this->employee1, 'api')
            ->patchJson('/api/notifications/' . $notification->id . '/read')
            ->assertStatus(403);
    }

    public function test_cannot_access_notifications_without_auth(): void
    {
        $this->getJson('/api/notifications')
            ->assertStatus(401);

        $this->patchJson('/api/notifications/read-all')
            ->assertStatus(401);
    }

    public function test_unread_count_returns_correct_number(): void
    {
        // Create 3 unread notifications
        $this->admin->notifications()->create([
            'title' => 'Notification 1',
            'message' => 'Message 1',
            'type' => 'task_assigned',
            'data' => [],
        ]);

        $this->admin->notifications()->create([
            'title' => 'Notification 2',
            'message' => 'Message 2',
            'type' => 'task_assigned',
            'data' => [],
        ]);

        $notification3 = $this->admin->notifications()->create([
            'title' => 'Notification 3',
            'message' => 'Message 3',
            'type' => 'task_assigned',
            'data' => [],
        ]);

        // Mark one as read
        $notification3->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(2, $response['unread_count']);
    }

    public function test_notifications_are_company_isolated(): void
    {
        // Create another company and user
        $otherCompany = Company::create([
            'name' => 'Other Company',
            'slug' => 'other-company',
        ]);

        $employeeRole = Role::firstOrCreateByName('employee');
        $otherEmployee = User::create([
            'company_id' => $otherCompany->id,
            'name' => 'Other Employee',
            'email' => 'other@test.com',
            'password' => bcrypt('password'),
        ]);
        $otherEmployee->roles()->attach($employeeRole);

        // Create notification for admin
        $this->admin->notifications()->create([
            'title' => 'Admin Notification',
            'message' => 'Only for admin',
            'type' => 'task_assigned',
            'data' => [],
        ]);

        // Other employee should not see admin's notifications
        $response = $this->actingAs($otherEmployee, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(0, $response['pagination']['total']);
    }

    public function test_admin_clear_does_not_affect_other_company_notifications(): void
    {
        $otherCompany = Company::factory()->create();
        $otherAdmin = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $otherCompanyNotification = $otherAdmin->notifications()->create([
            'title' => 'Other Company Notification',
            'message' => 'Other company only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $employeeNotification = $this->employee1->notifications()->create([
            'title' => 'Employee Notification',
            'message' => 'Employee only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->admin->notifications()->create([
            'title' => 'Admin Notification',
            'message' => 'Admin only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->actingAs($this->admin, 'api')
            ->patchJson('/api/notifications/clear')
            ->assertStatus(200);

        $this->assertFalse($otherCompanyNotification->fresh()->is_hidden);
        $this->assertTrue($employeeNotification->fresh()->is_hidden);

        $employeeResponse = $this->actingAs($this->employee1, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(0, $employeeResponse['pagination']['total']);
    }

    public function test_employee_clear_only_hides_own_notifications(): void
    {
        $employeeNotification = $this->employee1->notifications()->create([
            'title' => 'Employee Notification',
            'message' => 'Employee only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $adminNotification = $this->admin->notifications()->create([
            'title' => 'Admin Notification',
            'message' => 'Admin only',
            'type' => 'task_assigned',
            'data' => [],
            'is_read' => false,
        ]);

        $this->actingAs($this->employee1, 'api')
            ->patchJson('/api/notifications/clear')
            ->assertStatus(200);

        $this->assertTrue($employeeNotification->fresh()->is_hidden);
        $this->assertFalse($adminNotification->fresh()->is_hidden);

        $employeeResponse = $this->actingAs($this->employee1, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(0, $employeeResponse['pagination']['total']);

        $adminResponse = $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(1, $adminResponse['pagination']['total']);
    }

    public function test_notification_response_has_correct_structure(): void
    {
        $notification = $this->admin->notifications()->create([
            'title' => 'Test Notification',
            'message' => 'Test message',
            'type' => 'task_assigned',
            'data' => ['task_id' => $this->task->id],
        ]);

        $this->actingAs($this->admin, 'api')
            ->getJson('/api/notifications')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'user_id',
                        'title',
                        'message',
                        'type',
                        'data',
                        'read_at',
                        'created_at',
                        'is_read',
                    ],
                ],
            ]);
    }

    public function test_task_creation_notifies_other_company_admins(): void
    {
        $otherAdmin = User::create([
            'company_id' => $this->company->id,
            'name' => 'Admin 2',
            'email' => 'admin2@test.com',
            'password' => bcrypt('password'),
        ]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $project = $this->company->projects()->create([
            'name' => 'Task Create Project',
            'description' => 'Task create test',
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/tasks', [
                'project_id' => $project->id,
                'title' => 'Created Task',
                'description' => 'Created task description',
                'priority' => 'medium',
            ])
            ->assertStatus(201);

        $notification = $otherAdmin->notifications()
            ->where('type', 'task_created')
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame($project->id, $notification->metadata['project_id']);
        $this->assertSame($otherAdmin->id, $notification->user_id);
        $this->assertNotSame($this->admin->id, $notification->user_id);
    }
}
