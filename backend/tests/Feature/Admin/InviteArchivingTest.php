<?php

namespace Tests\Feature\Admin;

use App\Models\Company;
use App\Models\Invite;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InviteArchivingTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;
    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();

        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');

        $this->admin = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->employee->roles()->attach($employeeRole);
    }

    private function createInvite(array $attributes = []): Invite
    {
        return Invite::create(array_merge([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'email' => 'client'.fake()->unique()->numberBetween(1000, 9999).'@test.com',
            'role' => 'client',
            'token_hash' => sha1(fake()->uuid()),
            'expires_at' => now()->addDays(7),
            'revoked' => false,
            'is_hidden' => false,
        ], $attributes));
    }

    public function test_clean_table_archives_visible_invites(): void
    {
        $visibleInvite = $this->createInvite();
        $hiddenInvite = $this->createInvite(['is_hidden' => true]);

        $response = $this->actingAs($this->admin, 'api')->postJson('/api/admin/invites/clean');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Invites archived successfully',
            ]);

        $this->assertTrue($visibleInvite->refresh()->is_hidden);
        $this->assertTrue($hiddenInvite->refresh()->is_hidden);
    }

    public function test_history_returns_hidden_invites(): void
    {
        $visibleInvite = $this->createInvite();
        $hiddenInvite = $this->createInvite(['is_hidden' => true]);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/admin/invites/history');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $hiddenInvite->public_id)
            ->assertJsonPath('data.0.is_hidden', true)
            ->assertJsonPath('data.1.id', $visibleInvite->public_id)
            ->assertJsonPath('data.1.is_hidden', false);
    }

    public function test_restore_invite_unhides_it(): void
    {
        $invite = $this->createInvite(['is_hidden' => true]);

        $response = $this->actingAs($this->admin, 'api')->patchJson("/api/admin/invites/{$invite->public_id}/restore");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Invite restored successfully',
            ]);

        $this->assertFalse($invite->refresh()->is_hidden);
    }

    public function test_company_isolation_blocks_other_company_invites(): void
    {
        $otherCompany = Company::factory()->create();
        $otherAdmin = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $otherInvite = Invite::create([
            'company_id' => $otherCompany->id,
            'created_by' => $otherAdmin->id,
            'email' => 'other@test.com',
            'role' => 'client',
            'token_hash' => sha1(fake()->uuid()),
            'expires_at' => now()->addDays(7),
            'revoked' => false,
            'is_hidden' => true,
        ]);

        $history = $this->actingAs($this->admin, 'api')->getJson('/api/admin/invites/history');
        $history->assertOk();
        $this->assertFalse(collect($history->json('data'))->contains(fn (array $invite) => $invite['id'] === $otherInvite->public_id));

        $clean = $this->actingAs($this->admin, 'api')->postJson('/api/admin/invites/clean');
        $clean->assertOk();

        $this->assertTrue($otherInvite->refresh()->is_hidden);

        $restore = $this->actingAs($this->admin, 'api')->patchJson("/api/admin/invites/{$otherInvite->public_id}/restore");
        $restore->assertStatus(404);

        $this->assertTrue($otherInvite->refresh()->is_hidden);
    }

    public function test_admin_only_access(): void
    {
        $response = $this->actingAs($this->employee, 'api')->postJson('/api/admin/invites/clean');

        $response->assertStatus(403);
    }
}
