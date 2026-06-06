<?php

namespace App\Policies;

use App\Models\User;

class EmployeePolicy
{
    public function manage(User $user): bool
    {
        return $user->hasRole('admin');
    }
}
