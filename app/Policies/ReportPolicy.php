<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;

class ReportPolicy
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin');
    }

    private function isClient(User $user): bool
    {
        return $user->hasRole('client');
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user) || $this->isClient($user);
    }

    public function view(User $user, Report $report): bool
    {
        if ($user->company_id !== $report->company_id) {
            return false;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        return (
            $report->recipient_email && strcasecmp($report->recipient_email, $user->email) === 0
        ) || $report->created_by === $user->id;
    }

    public function download(User $user, Report $report): bool
    {
        return $this->view($user, $report);
    }

    public function email(User $user, Report $report): bool
    {
        return $this->isAdmin($user) && $user->company_id === $report->company_id;
    }

    public function delete(User $user, Report $report): bool
    {
        return $this->email($user, $report);
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }
}
