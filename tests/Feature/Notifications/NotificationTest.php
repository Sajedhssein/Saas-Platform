<?php

namespace Tests\Feature\Notifications;

use App\Events\CommentAdded;
use App\Events\FileUploaded;
use App\Events\ResponseSubmitted;
use App\Events\TaskAssigned;
use App\Events\TaskStatusChanged;
use App\Models\Company;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskFile;
use App\Models\TaskResponse;
use App\Models\User;
//use Illuminate\Support\Facades\Event;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;
    private User $user;
    private User $admin;
    private Company $company;
    private Project $project;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->user = User::factory()->create(['company_id' => $this->company->id]);
        $this->admin = User::factory()->create(['company_id' => $this->company->id]);
        $this->project = Project::factory()->create(['company_id' => $this->company->id]);
        $this->task = Task::factory()->create([
            'project_id' => $this->project->id,
            'created_by' => $this->admin->id,
        ]);
    }

    /**
     * Test user can list their notifications.
     */
    public function test_user_can_list_notifications(): void
    {
        Notification::factory()->count(3)->create(['user_id' => $this->user->id]);
        Notification::factory()->count(2)->create(['user_id' => $this->admin->id]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/notifications');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at'],
            ],
            'unread_count',
            'pagination' => ['total', 'per_page', 'current_page', 'last_page'],
        ]);
    }

    /**
     * Test user can mark single notification as read.
     */
    public function test_user_can_mark_single_notification_as_read(): void
    {
        $notification = Notification::factory()->create([
            'user_id' => $this->user->id,
            'is_read' => false,
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $this->assertTrue($notification->fresh()->is_read);
        $this->assertNotNull($notification->fresh()->read_at);
    }

    /**
     * Test user can mark all notifications as read.
     */
    public function test_user_can_mark_all_notifications_as_read(): void
    {
        Notification::factory()->count(3)->create([
            'user_id' => $this->user->id,
            'is_read' => false,
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson('/api/notifications/read-all');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('updated_count', 3);

        $this->assertEquals(0, $this->user->notifications()->where('is_read', false)->count());
    }

    /**
     * Test unread count in index response.
     */
    public function test_unread_count_in_index_response(): void
    {
        Notification::factory()->count(2)->create([
            'user_id' => $this->user->id,
            'is_read' => false,
        ]);
        Notification::factory()->create([
            'user_id' => $this->user->id,
            'is_read' => true,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/notifications');

        $response->assertStatus(200);
        $response->assertJsonPath('unread_count', 2);
    }

    /**
     * Test user cannot mark another user's notification as read.
     */
    public function test_user_cannot_mark_another_user_notification_as_read(): void
    {
        $notification = Notification::factory()->create(['user_id' => $this->admin->id]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(403);
        $this->assertFalse($notification->fresh()->is_read);
    }

    /**
     * Test notification created on task assignment.
     */
    public function test_notification_created_on_task_assignment(): void
    {
        $this->task->users()->attach($this->user->id);
        TaskAssigned::dispatch($this->task, $this->user, $this->admin);

        $notification = Notification::where('user_id', $this->user->id)
            ->where('type', 'task_assigned')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString($this->task->title, $notification->message);
    }

    /**
     * Test notification created on task status change.
     */
    public function test_notification_created_on_task_status_change(): void
    {
        $this->task->users()->attach($this->user->id);
        $oldStatus = $this->task->status;
        $newStatus = 'in_progress';

        TaskStatusChanged::dispatch($this->task, $oldStatus, $newStatus, $this->admin);

        $notification = Notification::where('user_id', $this->user->id)
            ->where('type', 'task_status_changed')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString($this->task->title, $notification->message);
    }

    /**
     * Test notification created on comment added.
     */
    public function test_notification_created_on_comment_added(): void
    {
        $this->task->users()->attach($this->user->id);
        $comment = TaskComment::factory()->create([
            'task_id' => $this->task->id,
            'user_id' => $this->admin->id,
        ]);

        CommentAdded::dispatch($comment, $this->task, $this->admin);

        $notification = Notification::where('user_id', $this->user->id)
            ->where('type', 'comment_added')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString($this->task->title, $notification->message);
    }

    /**
     * Test notification created on response submitted.
     */
    public function test_notification_created_on_response_submitted(): void
    {
        $response = TaskResponse::factory()->create([
            'task_id' => $this->task->id,
            'user_id' => $this->user->id,
        ]);

        ResponseSubmitted::dispatch($response, $this->task, $this->user);

        $notification = Notification::where('user_id', $this->admin->id)
            ->where('type', 'response_submitted')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString($this->task->title, $notification->message);
    }

    /**
     * Test notification created on file uploaded.
     */
    public function test_notification_created_on_file_uploaded(): void
    {
        $this->task->users()->attach($this->user->id);
        $file = TaskFile::factory()->create([
            'task_id' => $this->task->id,
            'uploaded_by' => $this->admin->id,
        ]);

        FileUploaded::dispatch($file, $this->task, $this->admin);

        $notification = Notification::where('user_id', $this->user->id)
            ->where('type', 'file_uploaded')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString($this->task->title, $notification->message);
    }

    /**
     * Test notification company scoped (user only sees own company's notifications).
     */
    public function test_notification_company_scoped(): void
    {
        $otherCompany = Company::factory()->create();
        $otherUser = User::factory()->create(['company_id' => $otherCompany->id]);
        Notification::factory()->create(['user_id' => $otherUser->id]);

        $userNotifications = Notification::factory()->count(2)->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/notifications');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');

        foreach ($response->json('data') as $notification) {
            $this->assertEquals($this->user->id, $notification['user_id']);
        }
    }

    /**
     * Test notification pagination.
     */
    public function test_notification_pagination(): void
    {
        Notification::factory()->count(25)->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/notifications');

        $response->assertStatus(200);
        $response->assertJsonCount(20, 'data');
        $response->assertJsonPath('pagination.total', 25);
        $response->assertJsonPath('pagination.per_page', 20);
        $response->assertJsonPath('pagination.current_page', 1);
        $response->assertJsonPath('pagination.last_page', 2);
    }

    /**
     * Test unauthenticated user cannot access notifications.
     */
    public function test_unauthenticated_user_cannot_access_notifications(): void
    {
        $response = $this->getJson('/api/notifications');

        $response->assertStatus(401);
    }
}
