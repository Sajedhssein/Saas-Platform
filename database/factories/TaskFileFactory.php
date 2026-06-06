<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaskFile>
 */
class TaskFileFactory extends Factory
{
    protected $model = TaskFile::class;

    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'uploaded_by' => User::factory(),
            'file_name' => $this->faker->word() . '.txt',
            'file_path' => '/files/' . $this->faker->word() . '.txt',
            'file_type' => 'text/plain',
            'file_size' => $this->faker->numberBetween(100, 2048),
        ];
    }
}
