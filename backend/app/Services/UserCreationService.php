<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserCreationService
{
    public function createUser(array $data, string $roleName, string $companyId): User
    {
        return DB::transaction(function () use ($data, $roleName, $companyId) {
            $user = User::create([
                'company_id' => $companyId,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'phone' => $data['phone'] ?? null,
            ]);

            $role = $this->findOrCreateRole($roleName);
            $user->roles()->syncWithoutDetaching([$role->id]);

            return $user;
        });
    }

    protected function findOrCreateRole(string $roleName): Role
    {
        return Role::getByName($roleName) ?? Role::create(['name' => strtolower(trim($roleName))]);
    }
}
