<?php

namespace App\Policies;

use App\Models\TaskFile;
use App\Models\User;

class TaskFilePolicy
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin');
    }

    private function canAccessTask(User $user, TaskFile $file): bool
    {
        $project = $file->task->project;

        if (! $project || $project->company_id !== $user->company_id) {
            return false;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        if ($user->hasRole('employee')) {
            return $file->task->users()->whereKey($user->id)->exists();
        }

        return $user->hasRole('client')
            && (
                $file->task->users()->whereKey($user->id)->exists()
                || $project->users()->whereKey($user->id)->exists()
            );
    }

    public function view(User $user, TaskFile $file): bool
    {
        return $this->canAccessTask($user, $file);
    }

    public function upload(User $user, TaskFile $file): bool
    {
        return $this->canAccessTask($user, $file);
    }

    public function delete(User $user, TaskFile $file): bool
    {
        return $this->isAdmin($user) && $this->canAccessTask($user, $file);
    }
}
