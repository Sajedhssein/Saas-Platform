<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\Role;
use App\Models\User;
use App\Models\Project;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskCommentTest extends TestCase
{
    use RefreshDatabase;

    private Task $task;
    private User $owner;
    private User $commenter;
    private User $anotherUser;

    protected function setUp(): void
    {
        parent::setUp();

        $company = Company::factory()->create();
        $this->owner = User::factory()->create(['company_id' => $company->id]);
        $this->commenter = User::factory()->create(['company_id' => $company->id]);
        $this->anotherUser = User::factory()->create(['company_id' => $company->id]);

        $employeeRole = Role::firstOrCreateByName('employee');
        $this->commenter->roles()->attach($employeeRole);
        $this->anotherUser->roles()->attach($employeeRole);

        $project = Project::create([
            'company_id' => $company->id,
            'created_by' => $this->owner->id,
            'name' => 'Test Project',
            'description' => 'Test project for comments',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 10000,
        ]);

        $this->task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->owner->id,
            'title' => 'Test Task',
            'description' => 'Test task for comments',
            'status' => 'pending',
            'priority' => 'medium',
            'progress' => 0,
            'deadline' => '2026-06-15',
            'estimated_hours' => 5,
        ]);

        $this->task->users()->attach($this->commenter->id);
    }

    /**
     * Test adding a comment to a task
     */
    public function test_user_can_add_comment_to_task(): void
    {
        $response = $this->actingAs($this->commenter)
            ->postJson("/api/tasks/{$this->task->id}/comments", [
                'content' => 'This is a test comment',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Comment added successfully')
            ->assertJsonPath('data.content', 'This is a test comment')
            ->assertJsonPath('data.is_edited', false);
    }

    /**
     * Test comment validation
     */
    public function test_comment_content_is_required(): void
    {
        $response = $this->actingAs($this->commenter)
            ->postJson("/api/tasks/{$this->task->id}/comments", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('content');
    }

    /**
     * Test comment content max length
     */
    public function test_comment_content_max_length(): void
    {
        $response = $this->actingAs($this->commenter)
            ->postJson("/api/tasks/{$this->task->id}/comments", [
                'content' => str_repeat('a', 5001),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('content');
    }

    /**
     * Test listing comments with pagination
     */
    public function test_list_comments_with_pagination(): void
    {
        // Create 20 comments
        for ($i = 1; $i <= 20; $i++) {
            $this->task->comments()->create([
                'user_id' => $this->commenter->id,
                'comment' => "Comment $i",
            ]);
        }

        $response = $this->actingAs($this->commenter)
            ->getJson("/api/tasks/{$this->task->id}/comments");

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 20)
            ->assertJsonPath('pagination.per_page', 15)
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.has_more', true);

        // Verify first page has 15 items
        $this->assertCount(15, $response->json('data'));

        // Test second page
        $response = $this->actingAs($this->commenter)
            ->getJson("/api/tasks/{$this->task->id}/comments?page=2");

        $response->assertStatus(200)
            ->assertJsonPath('pagination.current_page', 2)
            ->assertJsonPath('pagination.has_more', false);

        $this->assertCount(5, $response->json('data'));
    }

    /**
     * Test comments sorted newest first (default)
     */
    public function test_comments_sorted_newest_first_by_default(): void
    {
        $comment1 = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'First comment',
        ]);

        sleep(1); // Ensure different timestamps

        $comment2 = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Second comment',
        ]);

        $response = $this->actingAs($this->commenter)
            ->getJson("/api/tasks/{$this->task->id}/comments");

        $response->assertStatus(200);
        $data = $response->json('data');

        // Newest first
        $this->assertEquals($comment2->id, $data[0]['id']);
        $this->assertEquals($comment1->id, $data[1]['id']);
    }

    /**
     * Test comments sorted oldest first
     */
    public function test_comments_sorted_oldest_first(): void
    {
        $comment1 = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'First comment',
        ]);

        sleep(1); // Ensure different timestamps

        $comment2 = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Second comment',
        ]);

        $response = $this->actingAs($this->commenter)
            ->getJson("/api/tasks/{$this->task->id}/comments?sort=oldest");

        $response->assertStatus(200);
        $data = $response->json('data');

        // Oldest first
        $this->assertEquals($comment1->id, $data[0]['id']);
        $this->assertEquals($comment2->id, $data[1]['id']);
    }

    /**
     * Test updating a comment
     */
    public function test_comment_owner_can_update_comment(): void
    {
        $comment = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Original comment',
        ]);

        sleep(1); // Ensure updated_at > created_at

        $response = $this->actingAs($this->commenter)
            ->putJson("/api/comments/{$comment->id}", [
                'content' => 'Updated comment',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Comment updated successfully')
            ->assertJsonPath('data.content', 'Updated comment')
            ->assertJsonPath('data.is_edited', true);

        $this->assertDatabaseHas('task_comments', [
            'id' => $comment->id,
            'comment' => 'Updated comment',
        ]);
    }

    /**
     * Test non-owner cannot update comment
     */
    public function test_non_owner_cannot_update_comment(): void
    {
        $comment = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Original comment',
        ]);

        $response = $this->actingAs($this->anotherUser)
            ->putJson("/api/comments/{$comment->id}", [
                'content' => 'Updated comment',
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test deleting a comment (soft delete)
     */
    public function test_comment_owner_can_delete_comment(): void
    {
        $comment = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Comment to delete',
        ]);

        $response = $this->actingAs($this->commenter)
            ->deleteJson("/api/comments/{$comment->id}");

        $response->assertStatus(204);

        // Verify soft delete - record still exists in DB but is marked deleted
        $this->assertSoftDeleted('task_comments', ['id' => $comment->id]);
    }

    /**
     * Test non-owner cannot delete comment
     */
    public function test_non_owner_cannot_delete_comment(): void
    {
        $comment = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Comment to delete',
        ]);

        $response = $this->actingAs($this->anotherUser)
            ->deleteJson("/api/comments/{$comment->id}");

        $response->assertStatus(403);

        // Verify comment is not deleted
        $this->assertNotNull($comment->fresh());
    }

    /**
     * Test unauthenticated user cannot add comment
     */
    public function test_unauthenticated_user_cannot_add_comment(): void
    {
        $response = $this->postJson("/api/tasks/{$this->task->id}/comments", [
            'content' => 'This should fail',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test response includes edit tracking info
     */
    public function test_response_includes_edit_tracking_info(): void
    {
        $comment = $this->task->comments()->create([
            'user_id' => $this->commenter->id,
            'comment' => 'Test comment',
        ]);

        $response = $this->actingAs($this->commenter)
            ->getJson("/api/tasks/{$this->task->id}/comments");

        $response->assertStatus(200);
        $data = $response->json('data')[0];

        // Verify response includes all required fields
        $this->assertArrayHasKey('id', $data);
        $this->assertArrayHasKey('task_id', $data);
        $this->assertArrayHasKey('user', $data);
        $this->assertArrayHasKey('content', $data);
        $this->assertArrayHasKey('is_edited', $data);
        $this->assertArrayHasKey('created_at', $data);
        $this->assertArrayHasKey('updated_at', $data);
    }
}
