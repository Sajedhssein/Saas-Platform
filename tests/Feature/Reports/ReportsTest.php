<?php

namespace Tests\Feature\Reports;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;
    private User $employee;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-05-28 12:00:00'));

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

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function createProject(array $attributes): Project
    {
        $project = Project::create(array_merge([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => 'Project',
            'description' => 'Project description',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 0,
            'budget' => 1000,
        ], $attributes));

        if (array_key_exists('created_at', $attributes) || array_key_exists('updated_at', $attributes)) {
            $project->forceFill([
                'created_at' => $attributes['created_at'] ?? $project->created_at,
                'updated_at' => $attributes['updated_at'] ?? $project->updated_at,
            ])->saveQuietly();
        }

        return $project->refresh();
    }

    private function createTask(Project $project, array $attributes): Task
    {
        $task = Task::create(array_merge([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Task',
            'description' => 'Task description',
            'status' => 'pending',
            'priority' => 'medium',
            'deadline' => Carbon::now()->addDay(),
        ], $attributes));

        if (array_key_exists('created_at', $attributes) || array_key_exists('updated_at', $attributes)) {
            $task->forceFill([
                'created_at' => $attributes['created_at'] ?? $task->created_at,
                'updated_at' => $attributes['updated_at'] ?? $task->updated_at,
            ])->saveQuietly();
        }

        return $task->refresh();
    }

    public function test_weekly_report_returns_expected_metrics(): void
    {
        $projectOne = $this->createProject([
            'name' => 'Weekly Active Project',
            'status' => 'active',
            'progress' => 60,
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now()->subDays(2),
        ]);

        $projectTwo = $this->createProject([
            'name' => 'Weekly Completed Project',
            'status' => 'completed',
            'progress' => 80,
            'created_at' => Carbon::now()->subDays(4),
            'updated_at' => Carbon::now()->subDays(4),
        ]);

        $this->createProject([
            'name' => 'Old Project',
            'status' => 'active',
            'progress' => 10,
            'created_at' => Carbon::now()->subDays(12),
            'updated_at' => Carbon::now()->subDays(12),
        ]);

        $taskOne = $this->createTask($projectOne, [
            'title' => 'Completed Task 1',
            'status' => 'completed',
            'created_at' => Carbon::now()->subDays(6),
            'updated_at' => Carbon::now()->subDays(5),
            'deadline' => Carbon::now()->subDays(3),
        ]);
        $taskOne->users()->attach($this->employee->id, ['role' => 'assignee']);

        $taskTwo = $this->createTask($projectOne, [
            'title' => 'Completed Task 2',
            'status' => 'completed',
            'created_at' => Carbon::now()->subDays(5),
            'updated_at' => Carbon::now()->subDays(4),
            'deadline' => Carbon::now()->subDays(2),
        ]);
        $taskTwo->users()->attach($this->employee->id, ['role' => 'assignee']);

        $taskThree = $this->createTask($projectOne, [
            'title' => 'In Progress Task',
            'status' => 'in_progress',
            'created_at' => Carbon::now()->subDays(4),
            'updated_at' => Carbon::now()->subDays(4),
            'deadline' => Carbon::now()->addDays(2),
        ]);
        $taskThree->users()->attach($this->employee->id, ['role' => 'assignee']);

        $taskFour = $this->createTask($projectTwo, [
            'title' => 'Pending Task',
            'status' => 'pending',
            'created_at' => Carbon::now()->subDays(3),
            'updated_at' => Carbon::now()->subDays(3),
            'deadline' => Carbon::now()->subDay(),
        ]);
        $taskFour->users()->attach($this->employee->id, ['role' => 'assignee']);

        $taskFive = $this->createTask($projectTwo, [
            'title' => 'Completed Task 3',
            'status' => 'completed',
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now()->subDay(),
            'deadline' => Carbon::now()->subDay(),
        ]);
        $taskFive->users()->attach($this->client->id, ['role' => 'assignee']);

        $taskSix = $this->createTask($projectTwo, [
            'title' => 'Overdue Task',
            'status' => 'pending',
            'created_at' => Carbon::now()->subDay(),
            'updated_at' => Carbon::now()->subDay(),
            'deadline' => Carbon::now()->subDay(),
        ]);
        $taskSix->users()->attach($this->employee->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/reports/weekly');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'period' => 'weekly',
                ],
            ])
            ->assertJsonPath('data.projects.total', 2)
            ->assertJsonPath('data.projects.active', 0)
            ->assertJsonPath('data.projects.pending', 0)
            ->assertJsonPath('data.projects.in_progress', 2)
            ->assertJsonPath('data.projects.completed', 0)
            ->assertJsonPath('data.tasks.total', 6)
            ->assertJsonPath('data.tasks.completed', 3)
            ->assertJsonPath('data.tasks.in_progress', 1)
            ->assertJsonPath('data.tasks.pending', 2)
            ->assertJsonPath('data.tasks.overdue', 2)
            ->assertJsonPath('data.tasks.completion_rate', 50)
            ->assertJsonPath('data.employees.total', 1)
            ->assertJsonPath('data.employees.active_this_week', 1)
            ->assertJsonPath('data.performance.average_project_progress', 70);

        $topPerformers = $response->json('data.employees.top_performers');

        $this->assertCount(1, $topPerformers);
        $this->assertSame($this->employee->id, $topPerformers[0]['id']);
        $this->assertSame(2, $topPerformers[0]['completed_tasks']);
    }

    public function test_monthly_report_returns_expected_metrics(): void
    {
        $project = $this->createProject([
            'name' => 'Monthly Project',
            'status' => 'completed',
            'progress' => 100,
            'created_at' => Carbon::now()->subDays(20),
            'updated_at' => Carbon::now()->subDays(20),
        ]);

        $task = $this->createTask($project, [
            'title' => 'Monthly Completed Task',
            'status' => 'completed',
            'created_at' => Carbon::now()->subDays(20),
            'updated_at' => Carbon::now()->subDays(19),
            'deadline' => Carbon::now()->subDays(21),
        ]);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $this->createProject([
            'name' => 'Outside Monthly Window',
            'status' => 'active',
            'progress' => 0,
            'created_at' => Carbon::now()->subDays(40),
            'updated_at' => Carbon::now()->subDays(40),
        ]);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/reports/monthly');

        $response->assertStatus(200)
            ->assertJsonPath('data.period', 'monthly')
            ->assertJsonPath('data.projects.total', 1)
            ->assertJsonPath('data.tasks.total', 1)
            ->assertJsonPath('data.tasks.completed', 1)
            ->assertJsonPath('data.tasks.completion_rate', 100)
            ->assertJsonPath('data.performance.average_project_progress', 100);
    }

    public function test_custom_report_returns_expected_metrics(): void
    {
        $project = $this->createProject([
            'name' => 'Custom Project',
            'status' => 'active',
            'progress' => 55,
            'created_at' => Carbon::parse('2026-04-10'),
            'updated_at' => Carbon::parse('2026-04-10'),
        ]);

        $task = $this->createTask($project, [
            'title' => 'Custom Completed Task',
            'status' => 'completed',
            'created_at' => Carbon::parse('2026-04-12'),
            'updated_at' => Carbon::parse('2026-04-13'),
            'deadline' => Carbon::parse('2026-04-11'),
        ]);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $this->createProject([
            'name' => 'Outside Custom Window',
            'status' => 'completed',
            'progress' => 100,
            'created_at' => Carbon::parse('2026-05-15'),
            'updated_at' => Carbon::parse('2026-05-15'),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/reports/custom?start_date=2026-04-01&end_date=2026-04-30');

        $response->assertStatus(200)
            ->assertJsonPath('data.period', 'custom')
            ->assertJsonPath('data.projects.total', 1)
            ->assertJsonPath('data.tasks.total', 1)
            ->assertJsonPath('data.tasks.completed', 1)
            ->assertJsonPath('data.tasks.completion_rate', 100)
            ->assertJsonPath('data.performance.average_project_progress', 55);
    }

    public function test_reports_are_company_scoped(): void
    {
        $otherCompany = Company::factory()->create();
        $otherAdmin = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $otherProject = Project::create([
            'company_id' => $otherCompany->id,
            'created_by' => $otherAdmin->id,
            'name' => 'Other Company Project',
            'description' => 'Should not leak',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-01',
            'progress' => 90,
            'budget' => 1000,
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now()->subDays(2),
        ]);

        $otherTask = Task::create([
            'project_id' => $otherProject->id,
            'created_by' => $otherAdmin->id,
            'title' => 'Other Company Task',
            'description' => 'Should not leak',
            'status' => 'completed',
            'priority' => 'high',
            'deadline' => Carbon::now()->subDay(),
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now()->subDay(),
        ]);
        $otherTask->users()->attach($otherAdmin->id, ['role' => 'assignee']);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/reports/weekly');

        $response->assertStatus(200)
            ->assertJsonPath('data.projects.total', 0)
            ->assertJsonPath('data.tasks.total', 0)
            ->assertJsonPath('data.employees.active_this_week', 0)
            ->assertJsonPath('data.performance.average_project_progress', 0);
    }

    public function test_reports_return_zeroes_when_company_has_no_data(): void
    {
        $response = $this->actingAs($this->admin, 'api')->getJson('/api/reports/weekly');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'period' => 'weekly',
                    'projects' => [
                        'total' => 0,
                        'active' => 0,
                        'completed' => 0,
                    ],
                    'tasks' => [
                        'total' => 0,
                        'completed' => 0,
                        'in_progress' => 0,
                        'pending' => 0,
                        'overdue' => 0,
                        'completion_rate' => 0,
                    ],
                    'employees' => [
                        'total' => 1,
                        'active_this_week' => 0,
                    ],
                    'performance' => [
                        'average_project_progress' => 0,
                    ],
                ],
            ]);
    }

    public function test_non_admin_cannot_access_reports(): void
    {
        $employeeResponse = $this->actingAs($this->employee, 'api')->getJson('/api/reports/weekly');
        $clientResponse = $this->actingAs($this->client, 'api')->getJson('/api/reports/monthly');

        $employeeResponse->assertStatus(403);
        $clientResponse->assertStatus(403);
    }

    public function test_custom_report_validation_errors(): void
    {
        $response = $this->actingAs($this->admin, 'api')->getJson('/api/reports/custom');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_date', 'end_date']);

        $invalidRange = $this->actingAs($this->admin, 'api')
            ->getJson('/api/reports/custom?start_date=2026-05-10&end_date=2026-05-01');

        $invalidRange->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }
}
