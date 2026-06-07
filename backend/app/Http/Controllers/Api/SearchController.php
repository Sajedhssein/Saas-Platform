<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Report;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskFile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private const ADMIN_FILTERS = ['all', 'projects', 'tasks', 'employees', 'clients', 'reports', 'files'];
    private const EMPLOYEE_FILTERS = ['all', 'projects', 'tasks', 'comments', 'files'];
    private const CLIENT_FILTERS = ['all', 'projects', 'reports', 'files'];

    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = trim((string) $request->query('q', ''));
        $filter = strtolower(trim((string) $request->query('filter', 'all'))) ?: 'all';

        if ($query === '') {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $results = collect();

        if ($user->hasRole('admin')) {
            $filter = in_array($filter, self::ADMIN_FILTERS, true) ? $filter : 'all';
            $results = $results
                ->merge($this->includeFilter($filter, 'employees') ? $this->searchUsers($user, $query, 'employee') : [])
                ->merge($this->includeFilter($filter, 'clients') ? $this->searchUsers($user, $query, 'client') : [])
                ->merge($this->includeFilter($filter, 'projects') ? $this->searchAdminProjects($user, $query) : [])
                ->merge($this->includeFilter($filter, 'tasks') ? $this->searchAdminTasks($user, $query) : [])
                ->merge($this->includeFilter($filter, 'reports') ? $this->searchAdminReports($user, $query) : [])
                ->merge($this->includeFilter($filter, 'files') ? $this->searchAdminFiles($user, $query) : []);
        } elseif ($user->hasRole('employee')) {
            $filter = in_array($filter, self::EMPLOYEE_FILTERS, true) ? $filter : 'all';
            $results = $results
                ->merge($this->includeFilter($filter, 'projects') ? $this->searchEmployeeProjects($user, $query) : [])
                ->merge($this->includeFilter($filter, 'tasks') ? $this->searchEmployeeTasks($user, $query) : [])
                ->merge($this->includeFilter($filter, 'comments') ? $this->searchEmployeeComments($user, $query) : [])
                ->merge($this->includeFilter($filter, 'files') ? $this->searchEmployeeFiles($user, $query) : []);
        } elseif ($user->hasRole('client')) {
            $filter = in_array($filter, self::CLIENT_FILTERS, true) ? $filter : 'all';
            $results = $results
                ->merge($this->includeFilter($filter, 'projects') ? $this->searchClientProjects($user, $query) : [])
                ->merge($this->includeFilter($filter, 'reports') ? $this->searchClientReports($user, $query) : [])
                ->merge($this->includeFilter($filter, 'files') ? $this->searchClientFiles($user, $query) : []);
        }

        return response()->json([
            'success' => true,
            'data' => $results->take(12)->values(),
        ]);
    }

    private function searchUsers(User $user, string $query, string $role): array
    {
        $path = $role === 'employee' ? '/admin/employees' : '/admin/clients';

        return User::query()
            ->select(['id', 'name', 'email', 'department', 'position'])
            ->where('company_id', $user->company_id)
            ->whereHas('roles', fn (Builder $roleQuery) => $roleQuery->whereRaw('LOWER(name) = ?', [$role]))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['name', 'email', 'department', 'position']))
            ->orderBy('name')
            ->limit(4)
            ->get()
            ->map(fn (User $match) => [
                'id' => $match->id,
                'type' => $role,
                'title' => $match->name,
                'subtitle' => $match->email,
                'url' => $path,
            ])
            ->all();
    }

    private function searchAdminReports(User $user, string $query): array
    {
        return Report::query()
            ->select(['id', 'title', 'report_type', 'status'])
            ->where('company_id', $user->company_id)
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['title', 'report_type', 'status']))
            ->orderByDesc('generated_at')
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'type' => 'report',
                'title' => $report->title ?? 'Report',
                'subtitle' => trim("Report - {$report->report_type}"),
                'url' => '/admin/reports',
            ])
            ->all();
    }

    private function searchAdminFiles(User $user, string $query): array
    {
        return TaskFile::query()
            ->select(['id', 'task_id', 'file_name', 'file_type'])
            ->with('task:id,title,project_id')
            ->whereHas('task.project', fn (Builder $projectQuery) => $projectQuery->where('company_id', $user->company_id))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['file_name', 'file_type']))
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn (TaskFile $file) => [
                'id' => $file->id,
                'type' => 'file',
                'title' => $file->file_name,
                'subtitle' => trim('File' . ($file->task?->title ? " - {$file->task->title}" : '')),
                'url' => "/admin/tasks?task={$file->task_id}",
            ])
            ->all();
    }

    private function searchAdminProjects(User $user, string $query): array
    {
        return Project::query()
            ->select(['id', 'name', 'status'])
            ->where('company_id', $user->company_id)
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['name', 'description', 'status']))
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get()
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'type' => 'project',
                'title' => $project->name,
                'subtitle' => "Project - {$project->status}",
                'url' => "/admin/projects/{$project->id}",
            ])
            ->all();
    }

    private function searchAdminTasks(User $user, string $query): array
    {
        return Task::query()
            ->select(['id', 'project_id', 'title', 'status'])
            ->with('project:id,name,company_id')
            ->whereHas('project', fn (Builder $projectQuery) => $projectQuery->where('company_id', $user->company_id))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['title', 'description', 'status', 'priority']))
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'type' => 'task',
                'title' => $task->title,
                'subtitle' => trim("Task - {$task->status}" . ($task->project?->name ? " - {$task->project->name}" : '')),
                'url' => "/admin/tasks?task={$task->id}",
            ])
            ->all();
    }

    private function searchEmployeeProjects(User $user, string $query): array
    {
        return Project::query()
            ->select(['id', 'name', 'status'])
            ->where('company_id', $user->company_id)
            ->whereHas('employees', fn (Builder $employeeQuery) => $employeeQuery->whereKey($user->id))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['name', 'description', 'status']))
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get()
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'type' => 'project',
                'title' => $project->name,
                'subtitle' => "Project - {$project->status}",
                'url' => '/employee/projects',
            ])
            ->all();
    }

    private function searchEmployeeTasks(User $user, string $query): array
    {
        return Task::query()
            ->select(['id', 'project_id', 'title', 'status'])
            ->with('project:id,name,company_id')
            ->whereHas('project', fn (Builder $projectQuery) => $projectQuery->where('company_id', $user->company_id))
            ->whereHas('users', fn (Builder $taskUserQuery) => $taskUserQuery->whereKey($user->id))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['title', 'description', 'status', 'priority']))
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'type' => 'task',
                'title' => $task->title,
                'subtitle' => trim("Task - {$task->status}" . ($task->project?->name ? " - {$task->project->name}" : '')),
                'url' => "/employee/tasks?task={$task->id}",
            ])
            ->all();
    }

    private function searchEmployeeComments(User $user, string $query): array
    {
        return TaskComment::query()
            ->select(['id', 'task_id', 'user_id', 'comment', 'created_at'])
            ->with(['task:id,title,project_id', 'user:id,name'])
            ->whereHas('task.project', fn (Builder $projectQuery) => $projectQuery->where('company_id', $user->company_id))
            ->whereHas('task.users', fn (Builder $taskUserQuery) => $taskUserQuery->whereKey($user->id))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['comment']))
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn (TaskComment $comment) => [
                'id' => $comment->id,
                'type' => 'comment',
                'title' => $this->excerpt($comment->comment),
                'subtitle' => trim('Comment' . ($comment->task?->title ? " - {$comment->task->title}" : '')),
                'url' => "/employee/tasks?task={$comment->task_id}",
            ])
            ->all();
    }

    private function searchEmployeeFiles(User $user, string $query): array
    {
        return TaskFile::query()
            ->select(['id', 'task_id', 'file_name', 'file_type'])
            ->with('task:id,title,project_id')
            ->whereHas('task.project', fn (Builder $projectQuery) => $projectQuery->where('company_id', $user->company_id))
            ->whereHas('task.users', fn (Builder $taskUserQuery) => $taskUserQuery->whereKey($user->id))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['file_name', 'file_type']))
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn (TaskFile $file) => [
                'id' => $file->id,
                'type' => 'file',
                'title' => $file->file_name,
                'subtitle' => trim('File' . ($file->task?->title ? " - {$file->task->title}" : '')),
                'url' => "/employee/tasks?task={$file->task_id}",
            ])
            ->all();
    }

    private function searchClientProjects(User $user, string $query): array
    {
        return Project::query()
            ->select(['id', 'name', 'status'])
            ->where('company_id', $user->company_id)
            ->where(fn (Builder $visibilityQuery) => $visibilityQuery
                ->where('client_id', $user->id)
                ->orWhereHas('users', fn (Builder $pivotQuery) => $pivotQuery->whereKey($user->id)))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['name', 'description', 'status']))
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get()
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'type' => 'project',
                'title' => $project->name,
                'subtitle' => "Project - {$project->status}",
                'url' => '/client/projects',
            ])
            ->all();
    }

    private function searchClientReports(User $user, string $query): array
    {
        return Report::query()
            ->select(['id', 'title', 'report_type', 'status'])
            ->where('company_id', $user->company_id)
            ->where('recipient_email', $user->email)
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['title', 'report_type', 'status']))
            ->orderByDesc('generated_at')
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'type' => 'report',
                'title' => $report->title ?? 'Report',
                'subtitle' => trim("Report - {$report->report_type}"),
                'url' => "/client/reports/{$report->id}",
            ])
            ->all();
    }

    private function searchClientFiles(User $user, string $query): array
    {
        return TaskFile::query()
            ->select(['id', 'task_id', 'file_name', 'file_type'])
            ->with('task:id,title,project_id')
            ->whereHas('task.project', fn (Builder $projectQuery) => $projectQuery
                ->where('company_id', $user->company_id)
                ->where(fn (Builder $visibilityQuery) => $visibilityQuery
                    ->where('client_id', $user->id)
                    ->orWhereHas('users', fn (Builder $pivotQuery) => $pivotQuery->whereKey($user->id))))
            ->where(fn (Builder $itemQuery) => $this->match($itemQuery, $query, ['file_name', 'file_type']))
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(fn (TaskFile $file) => [
                'id' => $file->id,
                'type' => 'file',
                'title' => $file->file_name,
                'subtitle' => trim('File' . ($file->task?->title ? " - {$file->task->title}" : '')),
                'url' => '/client/files',
            ])
            ->all();
    }

    private function match(Builder $query, string $term, array $columns): void
    {
        $like = '%' . strtolower($term) . '%';

        foreach ($columns as $column) {
            $query->orWhereRaw("LOWER({$column}) LIKE ?", [$like]);
        }
    }

    private function includeFilter(string $selectedFilter, string $resource): bool
    {
        return $selectedFilter === 'all' || $selectedFilter === $resource;
    }

    private function excerpt(?string $text): string
    {
        $value = trim((string) $text);

        return mb_strlen($value) > 80 ? mb_substr($value, 0, 77) . '...' : $value;
    }
}
