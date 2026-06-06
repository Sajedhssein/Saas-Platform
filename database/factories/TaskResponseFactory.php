<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaskResponse>
 */
class TaskResponseFactory extends Factory
{
    protected $model = TaskResponse::class;

    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'user_id' => User::factory(),
            'response' => $this->faker->paragraph(),
            'status' => 'submitted',
            'attachment_url' => null,
        ];
    }
}
