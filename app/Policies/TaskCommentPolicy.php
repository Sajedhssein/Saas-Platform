<?php

namespace App\Policies;

use App\Models\TaskComment;
use App\Models\Task;
use App\Models\User;

class TaskCommentPolicy
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin');
    }

    private function canAccessTask(User $user, Task $task): bool
    {
        if ($task->project?->company_id !== $user->company_id) {
            return false;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        if ($user->hasRole('employee')) {
            return $task->users()->whereKey($user->id)->exists();
        }

        return $user->hasRole('client')
            && (
                $task->users()->whereKey($user->id)->exists()
                || $task->project?->users()->whereKey($user->id)->exists()
            );
    }

    public function viewAny(User $user, Task $task): bool
    {
        return $this->canAccessTask($user, $task);
    }

    public function create(User $user, Task $task): bool
    {
        return $this->canAccessTask($user, $task);
    }

    public function comment(User $user, Task $task): bool
    {
        return $this->create($user, $task);
    }

    /**
     * Only the comment owner can update the comment
     */
    public function update(User $user, TaskComment $comment): bool
    {
        return $user->id === $comment->user_id
            || ($this->isAdmin($user) && $user->company_id === $comment->task?->project?->company_id);
    }

    /**
     * Only the comment owner can delete the comment
     */
    public function delete(User $user, TaskComment $comment): bool
    {
        return $user->id === $comment->user_id
            || ($this->isAdmin($user) && $user->company_id === $comment->task?->project?->company_id);
    }
}
