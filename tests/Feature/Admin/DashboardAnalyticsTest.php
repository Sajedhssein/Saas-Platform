<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use Carbon\Carbon;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;
    private User $employee;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-05-29 12:00:00'));

        $this->company = Company::factory()->create();

        // Create roles
        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');
        $clientRole = Role::firstOrCreateByName('client');

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->employee->roles()->attach($employeeRole);

        $this->client = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->client->roles()->attach($clientRole);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_admin_can_access_dashboard_stats()
    {
        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'total_projects',
                    'total_tasks',
                    'total_users',
                    'active_tasks',
                    'completed_tasks',
                    'overdue_tasks',
                    'weekly_productivity' => [
                        '*' => ['day', 'completed'],
                    ],
                ]);
    }

    public function test_employee_cannot_access_dashboard_stats()
    {
        $this->actingAs($this->employee, 'api');

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(403);
    }

    public function test_client_cannot_access_dashboard_stats()
    {
        $this->actingAs($this->client, 'api');

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(403);
    }

    public function test_dashboard_stats_returns_correct_data()
    {
        // Create test data
        $project1 = Project::factory()->create(['company_id' => $this->company->id]);
        $project2 = Project::factory()->create(['company_id' => $this->company->id]);

        Task::factory()->create([
            'project_id' => $project1->id,
            'status' => 'in_progress',
            'deadline' => now()->addDays(1)
        ]);

        Task::factory()->create([
            'project_id' => $project1->id,
            'status' => 'completed',
            'deadline' => now()->addDays(1)
        ]);

        Task::factory()->create([
            'project_id' => $project2->id,
            'status' => 'in_progress',
            'deadline' => now()->subDays(1) // overdue
        ]);

        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
                ->assertJson([
                    'total_projects' => 2,
                    'total_tasks' => 3,
                    'total_users' => 3, // admin, employee, client
                    'active_tasks' => 2,
                    'completed_tasks' => 1,
                    'overdue_tasks' => 1
                ]);
    }

    public function test_admin_can_access_workload_analytics()
    {
        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/workload');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'employee_workloads' => [
                        '*' => [
                            'employee_id',
                            'employee_name',
                            'total_assigned_tasks',
                            'pending_tasks',
                            'in_progress_tasks',
                            'completed_tasks'
                        ]
                    ]
                ]);
    }

    public function test_employee_cannot_access_workload_analytics()
    {
        $this->actingAs($this->employee, 'api');

        $response = $this->getJson('/api/dashboard/workload');

        $response->assertStatus(403);
    }

    public function test_client_cannot_access_workload_analytics()
    {
        $this->actingAs($this->client, 'api');

        $response = $this->getJson('/api/dashboard/workload');

        $response->assertStatus(403);
    }

    public function test_workload_analytics_returns_correct_data()
    {
        $project = Project::factory()->create(['company_id' => $this->company->id]);

        $task1 = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'in_progress',
            'deadline' => now()->addDays(1)
        ]);
        $task1->users()->attach($this->employee->id, ['role' => 'assignee']);

        $task2 = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'deadline' => now()->addDays(1)
        ]);
        $task2->users()->attach($this->employee->id, ['role' => 'assignee']);

        $task3 = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'in_progress',
            'deadline' => now()->subDays(1) // overdue
        ]);
        $task3->users()->attach($this->employee->id, ['role' => 'assignee']);

        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/workload');

        $response->assertStatus(200);

        $workloads = $response->json('employee_workloads');
        $employeeWorkload = collect($workloads)->firstWhere('employee_id', $this->employee->id);

        $this->assertEquals(3, $employeeWorkload['total_assigned_tasks']);
        $this->assertEquals(1, $employeeWorkload['completed_tasks']);
        $this->assertEquals(0, $employeeWorkload['pending_tasks']);
        $this->assertEquals(2, $employeeWorkload['in_progress_tasks']);
    }

    public function test_admin_can_access_performance_analytics()
    {
        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/performance');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'employee_performance' => [
                        '*' => [
                            'employee_id',
                            'employee_name',
                            'completed_tasks',
                            'overdue_tasks',
                            'completion_rate',
                            'average_completion_time'
                        ]
                    ]
                ]);
    }

    public function test_employee_cannot_access_performance_analytics()
    {
        $this->actingAs($this->employee, 'api');

        $response = $this->getJson('/api/dashboard/performance');

        $response->assertStatus(403);
    }

    public function test_client_cannot_access_performance_analytics()
    {
        $this->actingAs($this->client, 'api');

        $response = $this->getJson('/api/dashboard/performance');

        $response->assertStatus(403);
    }

    public function test_performance_analytics_returns_correct_data()
    {
        $project = Project::factory()->create(['company_id' => $this->company->id]);

        // Create tasks for employee
        $task1 = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'created_at' => now()->subDays(10),
            'updated_at' => now()->subDays(5), // completed in 5 days
            'deadline' => now()->addDays(1)
        ]);
        $task1->users()->attach($this->employee->id, ['role' => 'assignee']);

        $task2 = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'created_at' => now()->subDays(7),
            'updated_at' => now()->subDays(2), // completed in 5 days
            'deadline' => now()->addDays(1)
        ]);
        $task2->users()->attach($this->employee->id, ['role' => 'assignee']);

        $task3 = Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'active',
            'deadline' => now()->subDays(1), // overdue
            'created_at' => now()->subDays(10)
        ]);
        $task3->users()->attach($this->employee->id, ['role' => 'assignee']);

        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/performance');

        $response->assertStatus(200);

        $metrics = $response->json('employee_performance');
        $employeeMetric = collect($metrics)->firstWhere('employee_id', $this->employee->id);

        $this->assertEquals(2, $employeeMetric['completed_tasks']);
        $this->assertEquals(1, $employeeMetric['overdue_tasks']);
        $this->assertEquals(66.67, round($employeeMetric['completion_rate'], 2)); // 2/3 * 100
        $this->assertEquals(5, $employeeMetric['average_completion_time']); // average of 5 and 5
    }

    public function test_unauthenticated_user_cannot_access_dashboard()
    {
        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(401);
    }

    public function test_user_cannot_access_other_company_data()
    {
        $otherCompany = Company::factory()->create();
        $otherAdminRole = Role::firstOrCreateByName('admin');
        $otherUser = User::factory()->create([
            'company_id' => $otherCompany->id,
        ]);
        $otherUser->roles()->attach($otherAdminRole);

        // Create data in other company
        $project = Project::factory()->create(['company_id' => $otherCompany->id]);
        $task = Task::factory()->create(['project_id' => $project->id]);
        $task->users()->attach($otherUser->id, ['role' => 'assignee']);

        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
                ->assertJson([
                    'total_projects' => 0, // Should not see other company's data
                    'total_tasks' => 0,
                    'total_users' => 3, // Only users in own company
                ]);
    }

    public function test_dashboard_stats_returns_weekly_productivity_with_mon_to_sun_order_and_zero_filled_days()
    {
        $project = Project::factory()->create(['company_id' => $this->company->id]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'updated_at' => Carbon::parse('2026-05-26 10:00:00'), // Tue
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'updated_at' => Carbon::parse('2026-05-26 15:00:00'), // Tue
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'updated_at' => Carbon::parse('2026-05-28 11:00:00'), // Thu
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'completed',
            'updated_at' => Carbon::parse('2026-05-21 11:00:00'), // outside last 7 days
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'in_progress',
            'updated_at' => Carbon::parse('2026-05-27 11:00:00'),
        ]);

        $otherCompany = Company::factory()->create();
        $otherProject = Project::factory()->create(['company_id' => $otherCompany->id]);
        Task::factory()->create([
            'project_id' => $otherProject->id,
            'status' => 'completed',
            'updated_at' => Carbon::parse('2026-05-26 11:00:00'),
        ]);

        $this->actingAs($this->admin, 'api');

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(200);

        $weekly = $response->json('weekly_productivity');

        $this->assertSame(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], array_column($weekly, 'day'));

        $counts = collect($weekly)->pluck('completed', 'day')->all();
        $this->assertSame(0, $counts['Mon']);
        $this->assertSame(2, $counts['Tue']);
        $this->assertSame(0, $counts['Wed']);
        $this->assertSame(1, $counts['Thu']);
        $this->assertSame(0, $counts['Fri']);
        $this->assertSame(0, $counts['Sat']);
        $this->assertSame(0, $counts['Sun']);
    }

    public function test_total_clients_and_company_isolation_are_respected(): void
    {
        $this->createClient('Alpha Client');
        $this->createClient('Beta Client');

        $otherCompany = Company::factory()->create();
        $otherClient = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherClient->roles()->attach(Role::firstOrCreateByName('client'));

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/dashboard/client-analytics');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_clients', 3)
            ->assertJsonPath('data.new_this_month', 3);
    }

    public function test_active_and_inactive_client_counts_use_is_active_flag(): void
    {
        $activeClient = $this->createClient('Active Client', true);
        $recentClient = $this->createClient('Recent Client', true);
        $this->createClient('Inactive Client', false);

        $activeProject = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'status' => 'active',
        ]);
        $activeProject->users()->attach($activeClient->id);

        ActivityLog::create([
            'user_id' => $recentClient->id,
            'action' => 'client_portal_viewed',
            'entity_type' => 'Client',
            'entity_id' => $recentClient->id,
            'description' => 'Recent client activity',
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/dashboard/client-analytics');

        $response->assertOk()
            ->assertJsonPath('data.active_clients', 3)
            ->assertJsonPath('data.inactive_clients', 1);
    }

    public function test_non_admin_cannot_access_client_analytics(): void
    {
        $response = $this->actingAs($this->employee, 'api')
            ->getJson('/api/dashboard/client-analytics');

        $response->assertStatus(403);
    }

    public function test_top_clients_are_ordered_by_project_count(): void
    {
        $topClient = $this->createClient('Top Client');
        $secondClient = $this->createClient('Second Client');
        $thirdClient = $this->createClient('Third Client');

        $this->attachProjects($topClient, ['active', 'active', 'completed', 'completed']);
        $this->attachProjects($secondClient, ['completed', 'completed', 'pending']);
        $this->attachProjects($thirdClient, ['completed']);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/dashboard/client-analytics');

        $response->assertOk();

        $topClients = $response->json('data.top_clients');

        $this->assertSame(
            [$topClient->id, $secondClient->id, $thirdClient->id],
            array_slice(array_column($topClients, 'id'), 0, 3)
        );

        $this->assertSame(4, $topClients[0]['projects_count']);
        $this->assertSame(3, $topClients[1]['projects_count']);
        $this->assertSame(1, $topClients[2]['projects_count']);
        $this->assertSame(2, $topClients[0]['completed_projects']);
        $this->assertSame(2, $topClients[1]['completed_projects']);
        $this->assertSame(1, $topClients[2]['completed_projects']);
    }

    public function test_growth_zero_fills_missing_months_and_keeps_fixed_order(): void
    {
        $this->createClientAt(Carbon::parse('2025-12-10 09:00:00'), 'December Client');
        $this->createClientAt(Carbon::parse('2026-02-14 09:00:00'), 'February Client');
        $this->createClientAt(Carbon::parse('2026-04-22 09:00:00'), 'April Client');
        $this->createClient('May Client');

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/dashboard/client-analytics');

        $response->assertOk();

        $growth = $response->json('data.growth');

        $this->assertSame(['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'], array_column($growth, 'month'));

        $counts = collect($growth)->pluck('count', 'month')->all();
        $this->assertSame(1, $counts['Dec']);
        $this->assertSame(0, $counts['Jan']);
        $this->assertSame(1, $counts['Feb']);
        $this->assertSame(0, $counts['Mar']);
        $this->assertSame(1, $counts['Apr']);
        $this->assertSame(2, $counts['May']);
    }

    public function test_project_distribution_groups_clients_by_project_status(): void
    {
        $activeClient = $this->createClient('Active Distribution Client');
        $completedClient = $this->createClient('Completed Distribution Client');
        $pendingClient = $this->createClient('Pending Distribution Client');

        $this->attachProjects($activeClient, ['active', 'completed']);
        $this->attachProjects($completedClient, ['completed', 'pending']);

        $pendingProject = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'status' => 'pending',
        ]);
        $pendingProject->users()->attach($pendingClient->id);

        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/dashboard/client-analytics');

        $response->assertOk()
            ->assertJsonPath('data.project_distribution.active', 1)
            ->assertJsonPath('data.project_distribution.completed', 1)
            ->assertJsonPath('data.project_distribution.pending', 2);
    }

    private function createClient(string $name, bool $isActive = true): User
    {
        $client = User::factory()->create([
            'company_id' => $this->company->id,
            'is_active' => $isActive,
            'name' => $name,
        ]);

        $client->roles()->attach(Role::firstOrCreateByName('client'));

        return $client;
    }

    private function createClientAt(Carbon $createdAt, string $name): User
    {
        $client = $this->createClient($name);

        User::query()
            ->whereKey($client->id)
            ->update([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

        return $client->refresh();
    }

    private function attachProjects(User $client, array $statuses): void
    {
        foreach ($statuses as $index => $status) {
            $project = Project::factory()->create([
                'company_id' => $this->company->id,
                'created_by' => $this->admin->id,
                'status' => $status,
                'name' => sprintf('%s Project %d', $client->name, $index + 1),
            ]);

            $project->users()->attach($client->id);
        }
    }
}
