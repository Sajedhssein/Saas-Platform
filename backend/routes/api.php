<?php

use App\Http\Controllers\Api\Admin\ClientController;
use App\Http\Controllers\Api\Admin\EmployeeController;
use App\Http\Controllers\Api\Admin\ProjectController;
use App\Http\Controllers\Api\Admin\ReportController as AdminReportController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\TaskController as AdminTaskController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Client\ProjectController as ClientProjectController;
use App\Http\Controllers\Api\Client\ReportController as ClientReportController;
use App\Http\Controllers\Api\Client\FileController as ClientFileController;
use App\Http\Controllers\Api\Client\DashboardController as ClientDashboardController;
use App\Http\Controllers\Api\Client\ProfileController as ClientProfileController;
use App\Http\Controllers\Api\Employee\ProjectController as EmployeeProjectController;
use App\Http\Controllers\Api\Employee\TaskController as EmployeeTaskController;
use App\Http\Controllers\Api\Admin\InviteController as AdminInviteController;
use App\Http\Controllers\Api\Auth\InviteController as AuthInviteController;
use App\Http\Controllers\Api\Employee\DashboardController as EmployeeDashboardController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:10,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
    Route::get('/invite/{publicId}', [AuthInviteController::class, 'validateInvite'])->middleware('throttle:30,1');
    Route::post('/invite/accept', [AuthInviteController::class, 'accept'])->middleware('throttle:10,1');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('throttle:10,1');

    Route::middleware(['auth:api', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/me', [AuthController::class, 'updateMe']);
    });
});

Route::prefix('admin')->group(function () {
    // Public temporary signed links or authenticated admin access are both handled by the controller.
    Route::get('/reports/{report}/download', [AdminReportController::class, 'download'])->name('admin.reports.download');
    Route::get('/reports/{report}/view', [AdminReportController::class, 'view'])->name('admin.reports.view');

    Route::middleware(['auth:api', 'active', 'role:admin'])->group(function () {
    Route::get('/invites', [AdminInviteController::class, 'index']);
    Route::get('/invites/stats', [AdminInviteController::class, 'stats']);
    Route::get('/invites/history', [AdminInviteController::class, 'history']);
    Route::post('/invites/clean', [AdminInviteController::class, 'clean']);
    Route::post('/invites/{invite}/resend', [AdminInviteController::class, 'resend']);
    Route::patch('/invites/{invite}/revoke', [AdminInviteController::class, 'revoke']);
    Route::patch('/invites/{invite}/restore', [AdminInviteController::class, 'restore']);
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    Route::post('/invites', [AdminInviteController::class, 'store']);
    Route::get('/clients', [ClientController::class, 'index']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);
    Route::delete('/clients/{client}', [ClientController::class, 'destroy']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);

    // User management
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
    Route::put('/users/{user}/roles', [UserController::class, 'updateRoles']);
    Route::patch('/users/{user}/deactivate', [UserController::class, 'deactivate']);
    Route::patch('/users/{user}/activate', [UserController::class, 'activate']);

    // Project management
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    // Client management
    // Task management
    Route::post('/tasks', [AdminTaskController::class, 'store']);
    Route::get('/tasks', [AdminTaskController::class, 'index']);
    Route::get('/tasks/{task}', [AdminTaskController::class, 'show']);
    Route::post('/tasks/{task}/assign', [AdminTaskController::class, 'assign']);
    Route::patch('/tasks/{task}/status', [AdminTaskController::class, 'updateStatus']);
    Route::post('/tasks/{task}/files', [AdminTaskController::class, 'uploadFile']);
    Route::get('/tasks/{task}/files/{taskFile}', [AdminTaskController::class, 'downloadFile']);
    Route::delete('/tasks/{task}/files/{taskFile}', [AdminTaskController::class, 'deleteFile']);

    // Enterprise reports
    Route::get('/reports', [AdminReportController::class, 'index'])->name('admin.reports.index');
    Route::post('/reports/generate', [AdminReportController::class, 'generate'])->name('admin.reports.generate');
    Route::get('/reports/{report}', [AdminReportController::class, 'show'])->name('admin.reports.show');
    Route::post('/reports/{report}/email', [AdminReportController::class, 'email'])->name('admin.reports.email');
    Route::delete('/reports/{report}', [AdminReportController::class, 'destroy'])->name('admin.reports.destroy');

    // Role management
    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    });
});

Route::prefix('settings')->middleware(['auth:api', 'active'])->group(function () {
    Route::middleware('role:admin')->group(function () {
        Route::get('/general', [SettingsController::class, 'general']);
        Route::put('/general', [SettingsController::class, 'updateGeneral']);
        Route::get('/team', [SettingsController::class, 'team']);
    });

    Route::put('/security', [SettingsController::class, 'security']);
    Route::get('/notifications', [SettingsController::class, 'notifications']);
    Route::put('/notifications', [SettingsController::class, 'updateNotifications']);
});

Route::middleware(['auth:api', 'active'])->group(function () {
    Route::get('/search', [SearchController::class, 'index']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);
    Route::patch('/profile/welcome-dismissed', [ProfileController::class, 'dismissWelcome']);

    Route::get('/employee/dashboard', [EmployeeDashboardController::class, 'show']);
    Route::get('/employee/projects', [EmployeeProjectController::class, 'index']);
    Route::get('/employee/tasks', [EmployeeTaskController::class, 'index']);
    Route::patch('/employee/tasks/{task}/status', [EmployeeTaskController::class, 'updateStatus']);
    Route::get('/tasks/assigned', [TaskController::class, 'assigned']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::get('/tasks/{task}/files/{taskFile}', [TaskController::class, 'showFile']);
    Route::get('/tasks/{task}/responses', [TaskController::class, 'responses']);
    Route::post('/tasks/{task}/responses', [TaskController::class, 'submitResponse']);

    // Task comments
    Route::post('/tasks/{task}/comments', [CommentController::class, 'store']);
    Route::get('/tasks/{task}/comments', [CommentController::class, 'index']);
    Route::put('/comments/{comment}', [CommentController::class, 'update']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    // Activity logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::delete('/activity-logs', [ActivityLogController::class, 'clear']);
    Route::get('/tasks/{task}/activity-logs', [ActivityLogController::class, 'taskLogs']);

    // Dashboard analytics (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/dashboard/workload', [DashboardController::class, 'workload']);
        Route::get('/dashboard/performance', [DashboardController::class, 'performance']);
        Route::get('/dashboard/client-analytics', [DashboardController::class, 'clientAnalytics']);
    });

    // Reports (authorized via 'can:viewReports' gate)
    Route::middleware('role:admin')->group(function () {
        Route::get('/reports/weekly', [ReportController::class, 'weekly']);
        Route::get('/reports/monthly', [ReportController::class, 'monthly']);
        Route::get('/reports/custom', [ReportController::class, 'custom']);
    });

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/clear', [NotificationController::class, 'clear']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    // also support PUT for clients that use PUT semantics
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
});

// Client portal - read-only client routes
Route::middleware(['auth:api', 'active', 'role:client'])->prefix('client')->group(function () {
    Route::get('/dashboard', [ClientDashboardController::class, 'show']);
    Route::get('/profile', [ClientProfileController::class, 'show']);
    Route::put('/profile', [ClientProfileController::class, 'update']);
    Route::patch('/password', [ClientProfileController::class, 'updatePassword']);
    Route::get('/projects', [ClientProjectController::class, 'index']);
    Route::get('/projects/{project}', [ClientProjectController::class, 'show']);
    Route::get('/reports', [ClientReportController::class, 'index']);
    Route::get('/reports/{report}', [ClientReportController::class, 'show']);
    Route::get('/files', [ClientFileController::class, 'index']);
});
