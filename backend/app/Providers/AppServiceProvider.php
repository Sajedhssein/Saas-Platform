<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\TaskComment;
use App\Models\Invite;
use App\Models\Notification;
use App\Models\Report;
use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use App\Observers\TaskObserver;
use App\Observers\ProjectObserver;
use App\Observers\ReportObserver;
use App\Policies\ClientPolicy;
use App\Policies\EmployeePolicy;
use App\Policies\InvitePolicy;
use App\Policies\NotificationPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\TaskCommentPolicy;
use App\Policies\ReportPolicy;
use App\Policies\TaskPolicy;

class AppServiceProvider extends ServiceProvider
{
    protected $policies = [
        TaskComment::class => TaskCommentPolicy::class,
        Task::class => TaskPolicy::class,
        \App\Models\Project::class => ProjectPolicy::class,
        \App\Models\TaskFile::class => \App\Policies\TaskFilePolicy::class,
        Report::class => ReportPolicy::class,
        Notification::class => NotificationPolicy::class,
        Invite::class => InvitePolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
        Task::observe(TaskObserver::class);
        Project::observe(ProjectObserver::class);
        Report::observe(ReportObserver::class);

        \Illuminate\Support\Facades\Gate::define('viewReports', function (User $user) {
            return $user->hasRole('admin');
        });

        \Illuminate\Support\Facades\Gate::define('manageEmployees', [EmployeePolicy::class, 'manage']);
        \Illuminate\Support\Facades\Gate::define('manageClients', [ClientPolicy::class, 'manage']);
    }

    /**
     * Register the application's policies.
     */
    protected function registerPolicies(): void
    {
        foreach ($this->policies as $model => $policy) {
            \Illuminate\Support\Facades\Gate::policy($model, $policy);
        }
    }
}

