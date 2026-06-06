<?php

namespace Tests\Feature\Settings;

use App\Models\Company;
use App\Models\NotificationPreference;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Company $otherCompany;
    private User $admin;
    private User $employee;
    private User $otherCompanyEmployee;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');

        $this->company = Company::factory()->create([
            'name' => 'Primary Company',
            'email' => 'primary@example.com',
            'phone' => '111-111-1111',
        ]);

        $this->otherCompany = Company::factory()->create([
            'name' => 'Other Company',
            'email' => 'other@example.com',
            'phone' => '222-222-2222',
        ]);

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Primary Admin',
            'email' => 'admin@primary.test',
        ]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Primary Employee',
            'email' => 'employee@primary.test',
        ]);
        $this->employee->roles()->attach($employeeRole);

        $this->otherCompanyEmployee = User::factory()->create([
            'company_id' => $this->otherCompany->id,
            'name' => 'Other Employee',
            'email' => 'employee@other.test',
        ]);
        $this->otherCompanyEmployee->roles()->attach($employeeRole);
    }

    public function test_general_settings_are_company_scoped(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/settings/general');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Primary Company')
            ->assertJsonPath('data.email', 'primary@example.com')
            ->assertJsonPath('data.phone', '111-111-1111');

        $this->actingAs($this->admin, 'api')
            ->putJson('/api/settings/general', [
                'name' => 'Updated Company',
                'email' => 'updated@example.com',
                'phone' => '999-999-9999',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Company');

        $this->assertDatabaseHas('companies', [
            'id' => $this->company->id,
            'name' => 'Updated Company',
            'email' => 'updated@example.com',
            'phone' => '999-999-9999',
        ]);

        $this->assertDatabaseHas('companies', [
            'id' => $this->otherCompany->id,
            'name' => 'Other Company',
            'email' => 'other@example.com',
            'phone' => '222-222-2222',
        ]);
    }

    public function test_security_settings_update_changes_password(): void
    {
        $this->actingAs($this->admin, 'api')
            ->putJson('/api/settings/security', [
                'current_password' => 'password',
                'new_password' => 'NewPassword123',
                'new_password_confirmation' => 'NewPassword123',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $freshAdmin = $this->admin->fresh();

        $this->assertTrue(Hash::check('NewPassword123', $freshAdmin->password));
        $this->assertFalse(Hash::check('password', $freshAdmin->password));
    }

    public function test_team_listing_is_company_scoped(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->getJson('/api/settings/team');

        $response->assertOk()
            ->assertJsonPath('total_members', 2)
            ->assertJsonCount(2, 'data');

        $this->assertTrue(collect($response->json('data'))
            ->contains(fn (array $member) => $member['email'] === 'admin@primary.test' && $member['role'] === 'admin'));

        $this->assertFalse(collect($response->json('data'))
            ->contains(fn (array $member) => $member['email'] === 'employee@other.test'));
    }

    public function test_notification_preferences_persist_and_gate_notifications(): void
    {
        $this->actingAs($this->employee, 'api')
            ->putJson('/api/settings/notifications', [
                'task_assigned' => false,
                'task_completed' => true,
                'project_updated' => true,
                'report_generated' => true,
                'employee_joined' => true,
                'invite_accepted' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.task_assigned', false)
            ->assertJsonPath('data.task_completed', true);

        $this->actingAs($this->employee, 'api')
            ->getJson('/api/settings/notifications')
            ->assertOk()
            ->assertJsonPath('data.task_assigned', false)
            ->assertJsonPath('data.project_updated', true);

        $preference = NotificationPreference::query()->where('user_id', $this->employee->id)->first();

        $this->assertNotNull($preference);
        $this->assertFalse($preference->task_assigned);

        $project = Project::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
        ]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Preference Blocked Task',
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/tasks/' . $task->id . '/assign', [
                'assignees' => [
                    ['id' => $this->employee->id, 'role' => 'developer'],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $this->employee->id,
            'type' => 'task_assigned',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $this->employee->id,
            'type' => 'task_assigned',
            'title' => 'Task Assigned',
        ]);
    }
}
