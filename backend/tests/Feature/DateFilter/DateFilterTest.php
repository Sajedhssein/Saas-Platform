<?php

namespace Tests\Feature\DateFilter;

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class DateFilterTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-05-28 12:00:00'));

        $this->company = Company::factory()->create();
        $adminRole = Role::firstOrCreateByName('admin');
        $this->admin = User::factory()->create(['company_id' => $this->company->id]);
        $this->admin->roles()->attach($adminRole);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_tasks_filter_today_week_month_custom()
    {
        $project = Project::factory()->create(['company_id' => $this->company->id]);

        // Task today
        Task::factory()->create([
            'project_id' => $project->id,
            'created_at' => Carbon::now(),
        ]);

        // Task within week (3 days ago)
        Task::factory()->create([
            'project_id' => $project->id,
            'created_at' => Carbon::now()->subDays(3),
        ]);

        // Task within month (10 days ago)
        Task::factory()->create([
            'project_id' => $project->id,
            'created_at' => Carbon::now()->subDays(10),
        ]);

        // Task older than month (40 days ago)
        Task::factory()->create([
            'project_id' => $project->id,
            'created_at' => Carbon::now()->subDays(40),
        ]);

        $this->actingAs($this->admin, 'api');

        // today => only 1
        $resToday = $this->getJson('/api/admin/tasks?range=today');
        $resToday->assertStatus(200)->assertJsonPath('meta.total', 1);

        // week => last 7 days include today and subDays(3) => 2
        $resWeek = $this->getJson('/api/admin/tasks?range=week');
        $resWeek->assertStatus(200)->assertJsonPath('meta.total', 2);

        // month => includes 10 days ago => 3
        $resMonth = $this->getJson('/api/admin/tasks?range=month');
        $resMonth->assertStatus(200)->assertJsonPath('meta.total', 3);

        // custom: include from day 5 to day 2 (should include the subDays(3) only)
        $start = Carbon::now()->subDays(5)->toDateString();
        $end = Carbon::now()->subDays(2)->toDateString();
        $resCustom = $this->getJson("/api/admin/tasks?start_date={$start}&end_date={$end}");
        $resCustom->assertStatus(200)->assertJsonPath('meta.total', 1);
    }
}
