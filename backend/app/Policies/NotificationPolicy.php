<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Notification $notification): bool
    {
        if ($notification->is_hidden || $user->company_id !== $notification->company_id) {
            return false;
        }

        return $this->isAdmin($user) || $notification->user_id === $user->id;
    }

    public function clear(User $user): bool
    {
        return true;
    }

    public function markAllAsRead(User $user): bool
    {
        return true;
    }

    public function update(User $user, Notification $notification): bool
    {
        return $this->view($user, $notification);
    }
}
