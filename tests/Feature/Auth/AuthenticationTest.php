<?php

namespace Tests\Feature\Auth;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_company_admin()
    {
        // Create the admin role
        Role::factory()->create(['name' => 'admin']);

        $response = $this->postJson('/api/auth/register', [
            'company_name' => 'Test Company',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'admin@test.com',
            'password' => 'Password123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Company and admin user registered successfully.',
            ])
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'token_type',
                    'expires_in',
                    'user' => [
                        'id',
                        'email',
                        'roles',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('companies', [
            'name' => 'Test Company',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'admin@test.com',
        ]);
    }

    public function test_login()
    {
        $user = User::factory()->create([
            'email' => 'user@test.com',
            'password' => bcrypt('Password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'user@test.com',
            'password' => 'Password123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => ['token'],
            ]);
    }

    public function test_login_with_invalid_credentials()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@test.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid credentials.',
            ]);
    }

    public function test_forgot_password_sends_reset_link_without_revealing_account_status()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'user@test.com',
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'If an account exists, a password reset link has been sent.',
            ]);

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_password_reset_flow_resets_password_and_allows_login()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'reset@test.com',
            'password' => bcrypt('OldPassword123'),
        ]);

        $token = null;
        Notification::assertNothingSent();

        $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
        ])->assertStatus(200);

        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use (&$token, $user) {
            $token = $notification->token;

            $mail = $notification->toMail($user)->toArray();
            $this->assertSame('Reset Password', $mail['actionText']);
            $this->assertStringContainsString('?token=', $mail['actionUrl']);
            $this->assertStringContainsString(urlencode($token), $mail['actionUrl']);

            $textBody = implode(' ', $mail['introLines'] ?? []);
            $this->assertStringNotContainsString($token, $textBody);
            $this->assertStringNotContainsString('http', $textBody);

            return true;
        });

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Password reset successful.',
            ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'NewPassword123!',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => ['token']]);
    }

    public function test_get_current_user()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_update_current_user_profile()
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'phone' => '111-111-1111',
            'department' => 'Old Department',
            'position' => 'Old Position',
        ]);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/auth/me', [
                'name' => 'New Name',
                'phone' => '222-222-2222',
                'department' => 'Engineering',
                'position' => 'Lead Engineer',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.phone', '222-222-2222')
            ->assertJsonPath('data.department', 'Engineering')
            ->assertJsonPath('data.position', 'Lead Engineer');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'phone' => '222-222-2222',
            'department' => 'Engineering',
            'position' => 'Lead Engineer',
        ]);
    }

    public function test_update_current_user_profile_rejects_restricted_fields()
    {
        $user = User::factory()->create([
            'email' => 'auth-user@test.com',
            'company_id' => Company::factory()->create()->id,
        ]);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/auth/me', [
                'email' => 'blocked@test.com',
                'company_id' => Company::factory()->create()->id,
                'roles' => ['admin'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'company_id', 'roles']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'auth-user@test.com',
        ]);
    }

    public function test_logout()
    {
        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $response = $this->withHeaders(['Authorization' => "Bearer $token"])
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Logged out successfully.',
            ]);
    }

    public function test_unauthenticated_access()
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
        $this->putJson('/api/auth/me', [
            'name' => 'Blocked',
        ])->assertStatus(401);
    }
}
