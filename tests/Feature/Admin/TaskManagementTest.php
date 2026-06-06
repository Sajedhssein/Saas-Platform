<?php

namespace Tests\Feature\Admin;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
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
    }

    public function test_admin_can_create_task()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Task Project',
            'description' => 'Project description.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 10000,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/tasks', [
                'project_id' => $project->id,
                'title' => 'Launch Campaign',
                'description' => 'Create a new marketing campaign.',
                'priority' => 'high',
                'deadline' => '2026-06-15 12:00:00',
                'estimated_hours' => 20,
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true, 'message' => 'Task created successfully.'])
            ->assertJsonPath('data.title', 'Launch Campaign');

        $this->assertDatabaseHas('tasks', [
            'title' => 'Launch Campaign',
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_admin_can_list_tasks_filtered_by_project()
    {
        $projectA = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Project A',
            'description' => 'First project.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $projectB = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Project B',
            'description' => 'Second project.',
            'status' => 'active',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'progress' => 0,
            'budget' => 8000,
        ]);

        Task::create([
            'project_id' => $projectA->id,
            'created_by' => $this->admin->id,
            'title' => 'Task A1',
            'description' => 'Task for project A.',
            'priority' => 'medium',
            'deadline' => '2026-05-20 18:00:00',
            'estimated_hours' => 10,
        ]);

        Task::create([
            'project_id' => $projectB->id,
            'created_by' => $this->admin->id,
            'title' => 'Task B1',
            'description' => 'Task for project B.',
            'priority' => 'medium',
            'deadline' => '2026-06-20 18:00:00',
            'estimated_hours' => 12,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/admin/tasks?project_id=' . $projectA->id);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.project_id', $projectA->id);
    }

    public function test_admin_can_assign_task_to_employees()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Assignment Project',
            'description' => 'Assignment project.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Design Review',
            'description' => 'Review design assets.',
            'priority' => 'high',
        ]);

        $employee = User::factory()->create([
            'company_id' => $this->company->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/tasks/{$task->id}/assign", [
                'assignees' => [
                    [
                        'id' => $employee->id,
                        'role' => 'assignee',
                    ],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'message' => 'Task assignees updated successfully.'])
            ->assertJsonPath('data.assignees.0.id', $employee->id);

        $this->assertDatabaseHas('task_users', [
            'task_id' => $task->id,
            'user_id' => $employee->id,
        ]);
    }

    public function test_admin_can_update_task_status()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Status Project',
            'description' => 'Status project.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Sprint Planning',
            'description' => 'Prepare next sprint.',
            'priority' => 'medium',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/admin/tasks/{$task->id}/status", [
                'status' => 'in_progress',
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'message' => 'Task status updated successfully.'])
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'in_progress',
            'progress' => 50,
        ]);
    }

    public function test_admin_can_sync_completed_task_progress()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Completed Task Project',
            'description' => 'Project for completed task progress sync.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Final Review',
            'description' => 'Complete the final review.',
            'priority' => 'medium',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->patchJson("/api/admin/tasks/{$task->id}/status", [
                'status' => 'completed',
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'message' => 'Task status updated successfully.'])
            ->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'completed',
            'progress' => 100,
        ]);
    }

    public function test_admin_can_upload_task_file()
    {
        Storage::fake(config('filesystems.default'));

        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'File Project',
            'description' => 'Project for file upload.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Upload Documentation',
            'description' => 'Upload the project requirements document.',
            'priority' => 'medium',
        ]);

        $file = UploadedFile::fake()->create('requirements.pdf', 100);

        $response = $this->actingAs($this->admin, 'api')
            ->post("/api/admin/tasks/{$task->id}/files", [
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true, 'message' => 'File uploaded successfully.'])
            ->assertJsonPath('data.file_name', 'requirements.pdf')
            ->assertJsonPath('data.name', 'requirements.pdf')
            ->assertJsonPath('data.filename', 'requirements.pdf')
            ->assertJsonPath('data.original_name', 'requirements.pdf')
            ->assertJsonPath('data.download_url', url("/api/tasks/{$task->id}/files/" . $response->json('data.id')));

        $uploadedFileName = basename($response->json('data.file_path'));
        Storage::disk(config('filesystems.default'))->assertExists("tasks/{$task->id}/{$uploadedFileName}");

        $this->assertDatabaseHas('task_files', [
            'task_id' => $task->id,
            'uploaded_by' => $this->admin->id,
            'file_name' => 'requirements.pdf',
        ]);
    }

    public function test_admin_can_delete_task_file()
    {
        Storage::fake(config('filesystems.default'));

        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Delete File Project',
            'description' => 'Project for file deletion.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Delete Attachment Task',
            'description' => 'Task with a file to delete.',
            'priority' => 'medium',
        ]);

        $file = UploadedFile::fake()->create('deletable.pdf', 100);

        $uploadResponse = $this->actingAs($this->admin, 'api')
            ->post("/api/admin/tasks/{$task->id}/files", [
                'file' => $file,
            ]);

        $taskFileId = $uploadResponse->json('data.id');
        $filePath = TaskFile::findOrFail($taskFileId)->file_path;

        $deleteResponse = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/admin/tasks/{$task->id}/files/{$taskFileId}");

        $deleteResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'File deleted successfully.',
            ]);

        Storage::disk(config('filesystems.default'))->assertMissing($filePath);
        $this->assertSoftDeleted('task_files', [
            'id' => $taskFileId,
        ]);
    }

    public function test_task_file_download_route_returns_file_when_not_requesting_json()
    {
        Storage::fake(config('filesystems.default'));

        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Download File Project',
            'description' => 'Project for download.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Download Attachment Task',
            'description' => 'Task with a downloadable file.',
            'priority' => 'medium',
        ]);

        $task->users()->attach($this->admin->id);

        $file = UploadedFile::fake()->create('download.pdf', 100);

        $uploadResponse = $this->actingAs($this->admin, 'api')
            ->post("/api/admin/tasks/{$task->id}/files", [
                'file' => $file,
            ]);

        $taskFileId = $uploadResponse->json('data.id');

        $response = $this->actingAs($this->admin, 'api')
            ->get("/api/tasks/{$task->id}/files/{$taskFileId}");

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('content-disposition', ''), 'attachment'));
    }

    public function test_admin_can_upload_duplicate_filenames_to_same_task()
    {
        Storage::fake(config('filesystems.default'));

        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Duplicate File Project',
            'description' => 'Project for duplicate file upload.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 5000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Upload Same Document',
            'description' => 'Upload the same file name twice.',
            'priority' => 'medium',
        ]);

        $firstFile = UploadedFile::fake()->create('requirements.pdf', 100);
        $secondFile = UploadedFile::fake()->create('requirements.pdf', 120);

        $firstResponse = $this->actingAs($this->admin, 'api')
            ->post("/api/admin/tasks/{$task->id}/files", [
                'file' => $firstFile,
            ]);

        $secondResponse = $this->actingAs($this->admin, 'api')
            ->post("/api/admin/tasks/{$task->id}/files", [
                'file' => $secondFile,
            ]);

        $firstResponse->assertStatus(201);
        $secondResponse->assertStatus(201);
        $secondResponse->assertJsonPath('data.file_name', 'requirements.pdf');

        $filePaths = TaskFile::where('task_id', $task->id)
            ->orderBy('created_at')
            ->pluck('file_path')
            ->toArray();

        $this->assertCount(2, $filePaths);
        $this->assertNotEquals($filePaths[0], $filePaths[1]);

        Storage::disk(config('filesystems.default'))->assertExists($filePaths[0]);
        Storage::disk(config('filesystems.default'))->assertExists($filePaths[1]);

        $this->assertDatabaseHas('task_files', [
            'task_id' => $task->id,
            'file_name' => 'requirements.pdf',
            'file_size' => 102400,
        ]);
        $this->assertDatabaseHas('task_files', [
            'task_id' => $task->id,
            'file_name' => 'requirements.pdf',
            'file_size' => 122880,
        ]);
    }
}
