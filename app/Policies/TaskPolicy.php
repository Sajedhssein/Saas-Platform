<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
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

    private function isAssignedToTask(User $user, Task $task): bool
    {
        return $task->users()->whereKey($user->id)->exists();
    }

    private function isProjectMember(User $user, Task $task): bool
    {
        return $task->project
            && $task->project->users()->whereKey($user->id)->exists();
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user) || $this->isEmployee($user) || $this->isClient($user);
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->company_id !== $task->project?->company_id) {
            return false;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        if ($this->isEmployee($user)) {
            return $this->isAssignedToTask($user, $task);
        }

        if ($this->isClient($user)) {
            return $this->isAssignedToTask($user, $task) || $this->isProjectMember($user, $task);
        }

        return false;
    }

    public function comment(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }

    public function uploadFile(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }

    public function changeStatus(User $user, Task $task): bool
    {
        if ($user->company_id !== $task->project?->company_id) {
            return false;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        return $this->isEmployee($user) && $this->isAssignedToTask($user, $task);
    }

    public function assign(User $user, Task $task): bool
    {
        return $this->isAdmin($user) && $user->company_id === $task->project?->company_id;
    }

    public function deleteFile(User $user, Task $task): bool
    {
        return $this->assign($user, $task);
    }

    public function respond(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }
}
