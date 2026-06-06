<?php

namespace Tests\Feature\Admin;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectStatusSyncTest extends TestCase
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

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $this->admin->roles()->attach($adminRole);
    }

    public function test_project_status_moves_to_in_progress_when_task_starts()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Pending Project',
            'description' => 'A project that should start pending.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ]);

        Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Initial Task',
            'description' => 'This task is not started yet.',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'pending',
        ]);

        $task = Task::where('project_id', $project->id)->first();
        $task->update(['status' => 'in_progress']);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_project_status_moves_to_completed_when_all_project_tasks_completed()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Completing Project',
            'description' => 'A project with multiple tasks.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ]);

        Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'First Task',
            'description' => 'First completed task.',
            'status' => 'completed',
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Second Task',
            'description' => 'Task in progress before completion.',
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'in_progress',
        ]);

        $task->update(['status' => 'completed']);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'completed',
        ]);
    }

    public function test_project_status_reopens_completed_project_when_task_reverts()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Reopen Project',
            'description' => 'A project that should reopen.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ]);

        $taskOne = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Completed Task One',
            'description' => 'Completed task.',
            'status' => 'completed',
        ]);

        $taskTwo = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Completed Task Two',
            'description' => 'Another completed task.',
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'completed',
        ]);

        $taskTwo->update(['status' => 'pending']);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_project_status_updates_when_task_is_deleted_and_restored()
    {
        $project = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Delete Restore Project',
            'description' => 'A project that updates on task delete and restore.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ]);

        $taskOne = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Completed Task',
            'description' => 'Completed task.',
            'status' => 'completed',
        ]);

        $taskTwo = Task::create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Pending Task',
            'description' => 'Pending task.',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'in_progress',
        ]);

        $taskTwo->delete();

        $this->assertSoftDeleted('tasks', ['id' => $taskTwo->id]);
        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'completed',
        ]);

        $taskTwo->restore();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_project_status_sync_isolated_between_companies()
    {
        $otherCompany = Company::factory()->create();
        $otherAdmin = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherRole = Role::firstOrCreate(['name' => 'admin']);
        $otherAdmin->roles()->attach($otherRole);

        $projectA = Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Company A Project',
            'description' => 'Company A project.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ]);

        $projectB = Project::create([
            'company_id' => $otherCompany->id,
            'created_by' => $otherAdmin->id,
            'name' => 'Company B Project',
            'description' => 'Company B project.',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ]);

        Task::create([
            'project_id' => $projectA->id,
            'created_by' => $this->admin->id,
            'title' => 'A Task',
            'description' => 'Task for company A project.',
            'status' => 'in_progress',
        ]);

        Task::create([
            'project_id' => $projectB->id,
            'created_by' => $otherAdmin->id,
            'title' => 'B Task',
            'description' => 'Task for company B project.',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $projectA->id,
            'status' => 'in_progress',
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $projectB->id,
            'status' => 'pending',
        ]);
    }
}
