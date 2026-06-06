<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin');
    }

    private function isEmployee(User $user): bool
    {
        return $user->hasRole('employee');
    }

    private function isClient(User $user): bool
    {
        return $user->hasRole('client');
    }

    private function isAssigned(User $user, Project $project): bool
    {
        return $project->client_id === $user->id || $project->users()->whereKey($user->id)->exists();
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user) || $this->isEmployee($user) || $this->isClient($user);
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->company_id !== $project->company_id) {
            return false;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        return $this->isAssigned($user, $project);
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, Project $project): bool
    {
        return $this->isAdmin($user) && $user->company_id === $project->company_id;
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }
}
