<?php

namespace Tests\Feature\Profile;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->user = User::factory()->create([
            'company_id' => $this->company->id,
            'name' => 'Profile User',
            'email' => 'profile.user@test.com',
            'phone' => '123-123-1234',
            'department' => 'Operations',
            'position' => 'Coordinator',
        ]);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        $this->actingAs($this->user, 'api')
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('id', $this->user->id)
            ->assertJsonPath('company_id', $this->company->id)
            ->assertJsonPath('role', null)
            ->assertJson([
                'name' => 'Profile User',
                'email' => 'profile.user@test.com',
                'phone' => '123-123-1234',
                'department' => 'Operations',
                'position' => 'Coordinator',
            ]);
    }

    public function test_authenticated_user_can_update_profile_and_changes_persist_after_refresh(): void
    {
        $this->actingAs($this->user, 'api')
            ->putJson('/api/profile', [
                'name' => 'Updated Name',
                'email' => 'updated.user@test.com',
                'phone' => '999-999-9999',
                'department' => 'Engineering',
                'position' => 'Senior Engineer',
            ])
            ->assertOk()
            ->assertJson([
                'name' => 'Updated Name',
                'email' => 'updated.user@test.com',
                'phone' => '999-999-9999',
                'department' => 'Engineering',
                'position' => 'Senior Engineer',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'name' => 'Updated Name',
            'email' => 'updated.user@test.com',
            'phone' => '999-999-9999',
            'department' => 'Engineering',
            'position' => 'Senior Engineer',
        ]);

        $this->actingAs($this->user->fresh(), 'api')
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJson([
                'name' => 'Updated Name',
                'email' => 'updated.user@test.com',
                'phone' => '999-999-9999',
                'department' => 'Engineering',
                'position' => 'Senior Engineer',
            ]);
    }

    public function test_profile_update_validates_payload(): void
    {
        $otherUser = User::factory()->create([
            'company_id' => $this->company->id,
            'email' => 'existing.user@test.com',
        ]);

        $this->actingAs($this->user, 'api')
            ->putJson('/api/profile', [
                'name' => '',
                'email' => $otherUser->email,
                'phone' => str_repeat('1', 31),
                'department' => str_repeat('a', 256),
                'position' => str_repeat('b', 256),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'name',
                'email',
                'phone',
                'department',
                'position',
            ]);
    }

    public function test_unauthenticated_user_cannot_access_profile_endpoints(): void
    {
        $this->getJson('/api/profile')->assertStatus(401);
        $this->putJson('/api/profile', [])->assertStatus(401);
    }

    public function test_profile_update_does_not_modify_other_user(): void
    {
        $otherCompany = Company::factory()->create();
        $otherUser = User::factory()->create([
            'company_id' => $otherCompany->id,
            'name' => 'Other User',
            'email' => 'other.user@test.com',
            'phone' => '555-000-0000',
            'department' => 'Finance',
            'position' => 'Analyst',
        ]);

        $this->actingAs($this->user, 'api')
            ->putJson('/api/profile', [
                'name' => 'Scoped User',
                'email' => 'scoped.user@test.com',
                'phone' => '111-222-3333',
                'department' => 'Product',
                'position' => 'Lead',
            ])
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $otherUser->id,
            'name' => 'Other User',
            'email' => 'other.user@test.com',
            'phone' => '555-000-0000',
            'department' => 'Finance',
            'position' => 'Analyst',
        ]);
    }
}
