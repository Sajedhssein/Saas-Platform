<?php

namespace Database\Factories;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(),
            'message' => $this->faker->paragraph(),
            'type' => $this->faker->randomElement([
                'task_assigned',
                'task_status_changed',
                'comment_added',
                'response_submitted',
                'file_uploaded',
            ]),
            'data' => [],
            'is_read' => false,
            'read_at' => null,
            'is_hidden' => false,
        ];
    }

    /**
     * Indicate that the notification should be marked as read.
     */
    public function read(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'is_read' => true,
                'read_at' => now(),
            ];
        });
    }

    /**
     * Indicate that the notification should be hidden.
     */
    public function hidden(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'is_hidden' => true,
            ];
        });
    }
}
