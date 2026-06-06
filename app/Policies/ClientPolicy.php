<?php

namespace App\Policies;

use App\Models\User;

class ClientPolicy
{
    public function manage(User $user): bool
    {
        return $user->hasRole('admin');
    }
}
