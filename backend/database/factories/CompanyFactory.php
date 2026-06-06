<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'slug' => fake()->slug(),
            'email' => fake()->companyEmail(),
            'phone' => fake()->phoneNumber(),
            'plan' => 'starter',
            'status' => 'active',
        ];
    }
}
