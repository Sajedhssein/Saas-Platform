<?php

namespace Tests\Feature\Notifications;

use App\Events\FileUploaded;
use App\Models\Company;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Report;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientNotificationsIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_assignment_creates_notification(): void
    {
        $company = Company::factory()->create();
        $client = User::factory()->create(['company_id' => $company->id]);

        $project = Project::factory()->create([
            'company_id' => $company->id,
            'client_id' => $client->id,
            'name' => 'Important Project',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type' => 'project_assigned',
        ]);
    }

    public function test_project_status_change_creates_notification_and_completed_type(): void
    {
        $company = Company::factory()->create();
        $client = User::factory()->create(['company_id' => $company->id]);

        $project = Project::factory()->create([
            'company_id' => $company->id,
            'client_id' => $client->id,
            'status' => 'pending',
            'name' => 'Status Project',
        ]);

        $project->update(['status' => 'in_progress']);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type' => 'project_status_changed',
        ]);

        $project->update(['status' => 'completed']);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type' => 'project_completed',
        ]);
    }

    public function test_report_available_creates_notification_for_recipient(): void
    {
        $company = Company::factory()->create();
        $client = User::factory()->create(['company_id' => $company->id]);

        $report = Report::create([
            'company_id' => $company->id,
            'created_by' => $client->id,
            'title' => 'Weekly',
            'status' => 'pending',
            'recipient_email' => $client->email,
        ]);

        $report->update(['status' => 'available']);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type' => 'report_available',
        ]);
    }

    public function test_file_uploaded_creates_notification_for_client(): void
    {
        $company = Company::factory()->create();
        $client = User::factory()->create(['company_id' => $company->id]);
        $project = Project::factory()->create(['company_id' => $company->id, 'client_id' => $client->id]);
        $task = Task::factory()->create(['project_id' => $project->id]);
        $file = TaskFile::factory()->create(['task_id' => $task->id]);

        FileUploaded::dispatch($file, $task, $task->creator ?? $task->created_by);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $client->id,
            'type' => 'file_uploaded',
        ]);
    }
}
