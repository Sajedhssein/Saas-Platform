<?php

namespace App\Policies;

use App\Models\Invite;
use App\Models\User;

class InvitePolicy
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, Invite $invite): bool
    {
        return $this->isAdmin($user) && $user->company_id === $invite->company_id;
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, Invite $invite): bool
    {
        return $this->isAdmin($user) && $user->company_id === $invite->company_id;
    }

    public function updateAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function delete(User $user, Invite $invite): bool
    {
        return $this->update($user, $invite);
    }

    public function restore(User $user, Invite $invite): bool
    {
        return $this->update($user, $invite);
    }

    public function stats(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function clear(User $user): bool
    {
        return $this->isAdmin($user);
    }
}
