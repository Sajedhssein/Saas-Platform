<?php

namespace Tests\Feature\Client;

use App\Models\Company;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientPortalTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $client;
    private User $otherClient;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->client = User::factory()->create(['company_id' => $this->company->id]);
        \App\Models\Role::firstOrCreateByName('client');
        $this->client->roles()->syncWithoutDetaching([\App\Models\Role::getByName('client')->id]);

        $otherCompany = Company::factory()->create();
        $this->otherClient = User::factory()->create(['company_id' => $otherCompany->id]);
        $this->otherClient->roles()->syncWithoutDetaching([\App\Models\Role::getByName('client')->id]);

        $this->project = Project::factory()->create(['company_id' => $this->company->id]);
    }

    public function test_client_can_list_projects(): void
    {
        $projects = Project::factory()->count(3)->create(['company_id' => $this->company->id]);

        foreach ($projects as $project) {
            $project->users()->attach($this->client->id);
        }

        Project::factory()->create(['company_id' => Company::factory()->create()->id]);

        $response = $this->actingAs($this->client, 'api')->getJson('/api/client/projects');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data', 'pagination']);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_client_can_view_project_details(): void
    {
        $this->project->users()->attach($this->client->id);

        $task = Task::factory()->create(['project_id' => $this->project->id]);
        $file = TaskFile::factory()->create(['task_id' => $task->id, 'uploaded_by' => $this->client->id]);

        $response = $this->actingAs($this->client, 'api')->getJson("/api/client/projects/{$this->project->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['id', 'name', 'description', 'tasks']]);
    }

    public function test_client_can_access_files(): void
    {
        $task = Task::factory()->create(['project_id' => $this->project->id]);
        TaskFile::factory()->count(3)->create(['task_id' => $task->id, 'uploaded_by' => $this->client->id]);
        $otherTask = Task::factory()->create(['project_id' => Project::factory()->create(['company_id' => Company::factory()->create()->id])->id]);
        TaskFile::factory()->create(['task_id' => $otherTask->id, 'uploaded_by' => $this->otherClient->id]);

        $response = $this->actingAs($this->client, 'api')->getJson('/api/client/files');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data', 'pagination']);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_client_cannot_edit_or_delete(): void
    {
        $response = $this->actingAs($this->client, 'api')->putJson("/api/admin/projects/{$this->project->id}", ['name' => 'x']);
        $response->assertStatus(403);

        $response = $this->actingAs($this->client, 'api')->deleteJson("/api/admin/projects/{$this->project->id}");
        $response->assertStatus(403);
    }

    public function test_company_isolation(): void
    {
        $otherProject = Project::factory()->create(['company_id' => Company::factory()->create()->id]);

        $response = $this->actingAs($this->client, 'api')->getJson("/api/client/projects/{$otherProject->id}");

        $response->assertStatus(404);
    }
}
