<?php

namespace Tests\Feature\Admin;

use App\Jobs\SendInviteEmail;
use App\Models\Company;
use App\Models\Invite;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class InviteLifecycleTest extends TestCase
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
            'resent_count' => 0,
        ], $attributes));
    }

    public function test_admin_can_filter_invites_by_status(): void
    {
        $pending = $this->createInvite();
        $accepted = $this->createInvite(['used_at' => now(), 'used_by' => $this->employee->id]);
        $expired = $this->createInvite(['expires_at' => now()->subDay()]);
        $revoked = $this->createInvite(['revoked' => true]);
        $hidden = $this->createInvite(['is_hidden' => true]);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/admin/invites?status=pending');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pending->public_id)
            ->assertJsonPath('data.0.status', 'pending');

        $acceptedResponse = $this->actingAs($this->admin, 'api')->getJson('/api/admin/invites?status=accepted');

        $acceptedResponse->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accepted->public_id)
            ->assertJsonPath('data.0.status', 'accepted');

        $hiddenResponse = $this->actingAs($this->admin, 'api')->getJson('/api/admin/invites?status=hidden');

        $hiddenResponse->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $hidden->public_id)
            ->assertJsonPath('data.0.status', 'hidden');

        $this->assertSame('expired', $expired->fresh()->status);
        $this->assertSame('revoked', $revoked->fresh()->status);
    }

    public function test_admin_can_view_invite_stats(): void
    {
        $this->createInvite();
        $this->createInvite(['used_at' => now(), 'used_by' => $this->employee->id]);
        $this->createInvite(['expires_at' => now()->subDay()]);
        $this->createInvite(['revoked' => true]);
        $this->createInvite(['is_hidden' => true]);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/admin/invites/stats');

        $response->assertOk()
            ->assertJsonPath('data.total', 4)
            ->assertJsonPath('data.pending', 1)
            ->assertJsonPath('data.accepted', 1)
            ->assertJsonPath('data.expired', 1)
            ->assertJsonPath('data.revoked', 1);
    }

    public function test_admin_can_resend_invite_updates_tracking(): void
    {
        Queue::fake();

        $invite = $this->createInvite(['last_resent_at' => null, 'resent_count' => 0]);

        $response = $this->actingAs($this->admin, 'api')->postJson("/api/admin/invites/{$invite->public_id}/resend");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Invite resent successfully')
            ->assertJsonPath('data.invite_id', $invite->public_id)
            ->assertJsonPath('data.resent_count', 1);

        $invite->refresh();
        $this->assertNotNull($invite->last_resent_at);
        $this->assertSame(1, $invite->resent_count);

        Queue::assertPushed(SendInviteEmail::class);
    }

    public function test_admin_can_revoke_invite(): void
    {
        $invite = $this->createInvite();

        $response = $this->actingAs($this->admin, 'api')->patchJson("/api/admin/invites/{$invite->public_id}/revoke");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Invite revoked successfully');

        $this->assertTrue($invite->refresh()->revoked);
    }

    public function test_revoked_invite_acceptance_is_blocked(): void
    {
        $invite = $this->createInvite(['revoked' => true]);

        $response = $this->postJson('/api/auth/invite/accept', [
            'invite_id' => $invite->public_id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(410)
            ->assertJsonPath('message', 'This invite has been revoked.');
    }

    public function test_expired_invite_acceptance_is_blocked(): void
    {
        $invite = $this->createInvite(['expires_at' => now()->subDay()]);

        $response = $this->postJson('/api/auth/invite/accept', [
            'invite_id' => $invite->public_id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(410)
            ->assertJsonPath('message', 'This invite has expired.');
    }

    public function test_used_invite_acceptance_is_blocked(): void
    {
        $invite = $this->createInvite(['used_at' => now(), 'used_by' => $this->employee->id]);

        $response = $this->postJson('/api/auth/invite/accept', [
            'invite_id' => $invite->public_id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('message', 'This invite has already been used.');
    }

    public function test_invite_acceptance_fails_for_already_registered_email(): void
    {
        $existingUser = User::factory()->create([
            'company_id' => $this->company->id,
            'email' => 'client@test.com',
        ]);

        $invite = $this->createInvite(['email' => $existingUser->email]);

        $response = $this->postJson('/api/auth/invite/accept', [
            'invite_id' => $invite->public_id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'This email is already registered.');

        $this->assertFalse($invite->fresh()->isAccepted());
    }

    public function test_other_company_cannot_access_invite_actions(): void
    {
        $otherCompany = Company::factory()->create();
        $otherAdmin = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $invite = $this->createInvite();

        $resend = $this->actingAs($otherAdmin, 'api')->postJson("/api/admin/invites/{$invite->public_id}/resend");
        $resend->assertStatus(404);

        $revoke = $this->actingAs($otherAdmin, 'api')->patchJson("/api/admin/invites/{$invite->public_id}/revoke");
        $revoke->assertStatus(404);
    }
}
