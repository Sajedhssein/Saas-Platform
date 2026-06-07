<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Invite;
use App\Models\Project;
use App\Models\Report;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

class ActivityLogService
{
    public static function taskCreated(string|User $user, string|Task $task, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured('task_created', $user, $task, $task->project, $metadata, $description);
    }

    public static function taskAssigned(string|User $user, string|Task $task, User $assignee, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured(
            'task_assigned',
            $user,
            $task,
            $task->project,
            array_merge($metadata, [
                'assigned_to' => $assignee->id,
                'assigned_to_name' => $assignee->name,
            ]),
            $description ?? "{$user->name} assigned {$assignee->name}"
        );
    }

    public static function taskUnassigned(string|User $user, string|Task $task, User $unassignedUser, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured(
            'task_unassigned',
            $user,
            $task,
            $task->project,
            array_merge($metadata, [
                'unassigned_user_id' => $unassignedUser->id,
                'unassigned_user_name' => $unassignedUser->name,
            ]),
            $description ?? "{$user->name} unassigned {$unassignedUser->name}"
        );
    }

    public static function statusChanged(string|User $user, string|Task $task, string $oldStatus, string $newStatus, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured(
            'status_changed',
            $user,
            $task,
            $task->project,
            array_merge($metadata, [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ]),
            $description ?? "{$user->name} changed status from {$oldStatus} to {$newStatus}"
        );
    }

    public static function commentAdded(string|User $user, string|Task $task, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured('comment_added', $user, $task, $task->project, $metadata, $description);
    }

    public static function fileUploaded(string|User $user, string|Task $task, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured('file_uploaded', $user, $task, $task->project, $metadata, $description);
    }

    public static function fileDeleted(string|User $user, string|Task $task, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured('file_deleted', $user, $task, $task->project, $metadata, $description);
    }

    public static function responseAdded(string|User $user, string|Task $task, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured('response_added', $user, $task, $task->project, $metadata, $description);
    }

    public static function log(...$arguments): ActivityLog
    {
        if (count($arguments) >= 2 && $arguments[1] instanceof User) {
            return static::logStructured(...$arguments);
        }

        return static::logLegacy(...$arguments);
    }

    public static function logStructured(
        string $action,
        User $user,
        ?Task $task = null,
        ?Project $project = null,
        array $metadata = [],
        ?string $description = null
    ): ActivityLog {
        $project ??= $task?->project;
        $metadata = $metadata ?: [];

        $oldValues = $metadata['old_values'] ?? null;
        $newValues = $metadata['new_values'] ?? null;
        unset($metadata['old_values'], $metadata['new_values']);

        return ActivityLog::create([
            'company_id' => $user->company_id ?? $project?->company_id ?? $task?->project?->company_id,
            'project_id' => $project?->id ?? $task?->project_id,
            'task_id' => $task?->id,
            'user_id' => $user->id,
            'action' => $action,
            'entity_type' => $task ? 'Task' : ($project ? 'Project' : ($metadata['entity_type'] ?? null)),
            'entity_id' => $task?->id ?? $project?->id ?? ($metadata['entity_id'] ?? null),
            'description' => $description ?? static::describe($action, $user, $task, $project, $metadata),
            'metadata' => empty($metadata) ? null : $metadata,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
        ]);
    }

    public static function logTaskCreated(string $userId, string $taskId, array $taskData): ActivityLog
    {
        return static::logLegacy($userId, 'TASK_CREATED', 'Task created: ' . ($taskData['title'] ?? 'Untitled task'), 'Task', $taskId, [], $taskData);
    }

    public static function logTaskUpdated(string $userId, string $taskId, array $oldValues, array $newValues): ActivityLog
    {
        $changedFields = array_keys(array_diff_assoc($oldValues, $newValues));

        return static::logLegacy(
            $userId,
            'TASK_UPDATED',
            'Task updated. Fields changed: ' . implode(', ', $changedFields),
            'Task',
            $taskId,
            $oldValues,
            $newValues
        );
    }

    public static function logTaskStatusChanged(string $userId, string $taskId, string $oldStatus, string $newStatus): ActivityLog
    {
        return static::logLegacy(
            $userId,
            'TASK_STATUS_CHANGED',
            "Task status changed from '{$oldStatus}' to '{$newStatus}'",
            'Task',
            $taskId,
            ['status' => $oldStatus],
            ['status' => $newStatus]
        );
    }

    public static function logTaskCompleted(string|User $user, string|Task $task, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $task = static::resolveTask($task);

        return static::logStructured('task_completed', $user, $task, null, $metadata, $description);
    }

    public static function logTaskAssigned(string $userId, string $taskId, string $assignedToUserId, string $assignedToUserName, string $role = null): ActivityLog
    {
        $task = Task::query()->with('project')->find($taskId);
        $user = static::resolveUser($userId);

        return static::logLegacy(
            $userId,
            'TASK_ASSIGNED',
            $task && $user ? "{$user->name} assigned task \"{$task->title}\" to {$assignedToUserName}" : "Task assigned to {$assignedToUserName}",
            'Task',
            $taskId,
            [],
            [
                'assigned_to' => $assignedToUserId,
                'assigned_to_name' => $assignedToUserName,
                'role' => $role,
            ]
        );
    }

    public static function logTaskUnassigned(string $userId, string $taskId, string $unassignedUserName): ActivityLog
    {
        $task = Task::query()->with('project')->find($taskId);
        $user = static::resolveUser($userId);

        return static::logStructured(
            'task_unassigned',
            $user,
            $task,
            $task?->project,
            ['unassigned_user_name' => $unassignedUserName],
            $task && $user ? "{$user->name} unassigned {$unassignedUserName} from task \"{$task->title}\"" : "Task unassigned from {$unassignedUserName}"
        );
    }

    public static function logFileUploaded(string $userId, string $taskId, string $fileName, int $fileSize): ActivityLog
    {
        $task = Task::query()->with('project')->find($taskId);
        $user = static::resolveUser($userId);

        return static::logLegacy(
            $userId,
            'FILE_UPLOADED',
            $user ? "{$user->name} uploaded file {$fileName}" : "File uploaded: {$fileName}",
            'Task',
            $taskId,
            [],
            ['file_name' => $fileName, 'file_size' => $fileSize]
        );
    }

    public static function logFileDeleted(string $userId, string $taskId, string $fileName): ActivityLog
    {
        $task = Task::query()->with('project')->find($taskId);
        $user = static::resolveUser($userId);

        return static::logStructured(
            'file_deleted',
            $user,
            $task,
            $task?->project,
            ['file_name' => $fileName],
            $user ? "{$user->name} deleted file {$fileName}" : "File deleted: {$fileName}"
        );
    }

    public static function logCommentCreated(string $userId, string $taskId, string $userName, string $commentPreview): ActivityLog
    {
        $user = static::resolveUser($userId);

        return static::logLegacy(
            $userId,
            'COMMENT_CREATED',
            $user ? "{$user->name} added a comment" : "Comment added by {$userName}",
            'Task',
            $taskId,
            [],
            ['comment' => $commentPreview, 'commented_by' => $userName]
        );
    }

    public static function logCommentUpdated(string $userId, string $taskId, string $userName): ActivityLog
    {
        $user = static::resolveUser($userId);

        return static::logLegacy(
            $userId,
            'COMMENT_UPDATED',
            $user ? "{$user->name} updated a comment" : "Comment updated by {$userName}",
            'Task',
            $taskId,
            [],
            ['commented_by' => $userName]
        );
    }

    public static function logCommentDeleted(string $userId, string $taskId, string $userName): ActivityLog
    {
        $user = static::resolveUser($userId);

        return static::logLegacy(
            $userId,
            'COMMENT_DELETED',
            $user ? "{$user->name} deleted a comment" : "Comment deleted by {$userName}",
            'Task',
            $taskId,
            [],
            ['commented_by' => $userName]
        );
    }

    public static function logResponseSubmitted(string $userId, string $taskId, string $userName): ActivityLog
    {
        $user = static::resolveUser($userId);

        return static::logLegacy(
            $userId,
            'RESPONSE_SUBMITTED',
            $user ? "{$user->name} submitted a response" : "Task response submitted by {$userName}",
            'Task',
            $taskId,
            [],
            ['submitted_by' => $userName]
        );
    }

    public static function logProjectCreated(string|User $user, string|Project $project, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $project = static::resolveProject($project);

        return static::logStructured('project_created', $user, null, $project, $metadata, $description);
    }

    public static function logProjectCompleted(string|User $user, string|Project $project, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $project = static::resolveProject($project);

        return static::logStructured('project_completed', $user, null, $project, $metadata, $description);
    }

    public static function logProjectUpdated(string|User $user, string|Project $project, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $project = static::resolveProject($project);

        return static::logStructured('project_updated', $user, null, $project, $metadata, $description);
    }

    public static function logInviteSent(string|User $user, Invite $invite, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $metadata = array_merge($metadata, ['entity_type' => 'Invite', 'entity_id' => $invite->id, 'invite_email' => $invite->email]);

        return static::logStructured('invite_sent', $user, null, null, $metadata, $description ?? "{$user->name} sent invite to {$invite->email}");
    }

    public static function logInviteResent(string|User $user, Invite $invite, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $metadata = array_merge($metadata, ['entity_type' => 'Invite', 'entity_id' => $invite->id, 'invite_email' => $invite->email]);

        return static::logStructured('invite_resent', $user, null, null, $metadata, $description ?? "{$user->name} resent invite to {$invite->email}");
    }

    public static function logInviteRevoked(string|User $user, Invite $invite, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $metadata = array_merge($metadata, ['entity_type' => 'Invite', 'entity_id' => $invite->id, 'invite_email' => $invite->email]);

        return static::logStructured('invite_revoked', $user, null, null, $metadata, $description ?? "{$user->name} revoked invite to {$invite->email}");
    }

    public static function logInviteAccepted(string|User $user, Invite $invite, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $metadata = array_merge($metadata, ['entity_type' => 'Invite', 'entity_id' => $invite->id, 'invite_email' => $invite->email]);

        return static::logStructured('invite_accepted', $user, null, null, $metadata, $description ?? "{$user->name} accepted invite for {$invite->email}");
    }

    public static function logReportGenerated(string|User $user, Report $report, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $metadata = array_merge($metadata, ['entity_type' => 'Report', 'entity_id' => $report->id, 'report_title' => $report->title]);

        return static::logStructured('report_generated', $user, null, null, $metadata, $description ?? "{$user->name} generated report \"{$report->title}\"");
    }

    public static function logReportViewed(string|User $user, Report $report, array $metadata = [], ?string $description = null): ActivityLog
    {
        $user = static::resolveUser($user);
        $metadata = array_merge($metadata, ['entity_type' => 'Report', 'entity_id' => $report->id, 'report_title' => $report->title]);

        return static::logStructured('report_viewed', $user, null, null, $metadata, $description ?? "{$user->name} viewed report \"{$report->title}\"");
    }

    public static function logUserActivated(string|User $actor, User $target, array $metadata = [], ?string $description = null): ActivityLog
    {
        $actor = static::resolveUser($actor);
        $role = static::primaryRoleName($target);
        $metadata = array_merge($metadata, ['entity_type' => 'User', 'entity_id' => $target->id, 'target_user_name' => $target->name, 'target_role' => $role]);

        return static::logStructured('user_activated', $actor, null, null, $metadata, $description ?? "{$actor->name} activated {$role} {$target->name}");
    }

    public static function logUserDeactivated(string|User $actor, User $target, array $metadata = [], ?string $description = null): ActivityLog
    {
        $actor = static::resolveUser($actor);
        $role = static::primaryRoleName($target);
        $metadata = array_merge($metadata, ['entity_type' => 'User', 'entity_id' => $target->id, 'target_user_name' => $target->name, 'target_role' => $role]);

        return static::logStructured('user_deactivated', $actor, null, null, $metadata, $description ?? "{$actor->name} deactivated {$role} {$target->name}");
    }

    public static function logClientCreated(string|User $actor, User $client, array $metadata = [], ?string $description = null): ActivityLog
    {
        $actor = static::resolveUser($actor);
        $metadata = array_merge($metadata, ['entity_type' => 'User', 'entity_id' => $client->id, 'client_name' => $client->name, 'client_email' => $client->email]);

        return static::logStructured('client_created', $actor, null, null, $metadata, $description ?? "{$actor->name} created client {$client->name}");
    }

    private static function logLegacy(
        string $userId,
        string $action,
        string $description,
        string $entityType,
        ?string $entityId = null,
        array $oldValues = [],
        array $newValues = []
    ): ActivityLog {
        $user = User::query()->find($userId);
        $task = $entityType === 'Task' && $entityId ? Task::query()->with('project')->find($entityId) : null;
        $project = $entityType === 'Project' && $entityId ? Project::query()->find($entityId) : $task?->project;

        return ActivityLog::create([
            'company_id' => $user?->company_id ?? $project?->company_id ?? $task?->project?->company_id,
            'project_id' => $project?->id ?? $task?->project_id,
            'task_id' => $task?->id,
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'metadata' => null,
            'old_values' => empty($oldValues) ? null : $oldValues,
            'new_values' => empty($newValues) ? null : $newValues,
            'ip_address' => Request::ip(),
        ]);
    }

    private static function resolveUser(string|User $user): User
    {
        return $user instanceof User ? $user : User::query()->findOrFail($user);
    }

    private static function resolveTask(string|Task $task): Task
    {
        return $task instanceof Task ? $task : Task::query()->with('project')->findOrFail($task);
    }

    private static function resolveProject(string|Project $project): Project
    {
        return $project instanceof Project ? $project : Project::query()->findOrFail($project);
    }

    private static function describe(string $action, User $user, ?Task $task, ?Project $project, array $metadata): string
    {
        return match ($action) {
            'task_assigned' => $task ? sprintf(
                '%s assigned task "%s" to %s',
                $user->name,
                $task->title,
                $metadata['assigned_to_name'] ?? $metadata['assignee_name'] ?? 'a team member'
            ) : 'Task assigned',
            'task_unassigned' => $task ? sprintf('%s unassigned %s from task "%s"', $user->name, $metadata['unassigned_user_name'] ?? 'a user', $task->title) : 'Task unassigned',
            'task_status_changed' => $task ? sprintf(
                'Task "%s" moved from %s to %s',
                $task->title,
                $metadata['old_status'] ?? 'unknown',
                $metadata['new_status'] ?? 'unknown'
            ) : 'Task status changed',
            'task_completed' => $task ? sprintf('Task "%s" completed', $task->title) : 'Task completed',
            'task_created' => $task ? sprintf('%s created task "%s"', $user->name, $task->title) : 'Task created',
            'file_uploaded' => $metadata['file_name'] ?? 'File uploaded',
            'file_deleted' => $metadata['file_name'] ?? 'File deleted',
            'comment_added' => $user->name . ' added a comment',
            'comment_updated' => $user->name . ' updated a comment',
            'comment_deleted' => $user->name . ' deleted a comment',
            'response_submitted' => $user->name . ' submitted a response',
            'invite_sent' => sprintf('%s sent invite to %s', $user->name, $metadata['invite_email'] ?? 'a recipient'),
            'invite_resent' => sprintf('%s resent invite to %s', $user->name, $metadata['invite_email'] ?? 'a recipient'),
            'invite_revoked' => sprintf('%s revoked invite to %s', $user->name, $metadata['invite_email'] ?? 'a recipient'),
            'invite_accepted' => sprintf('%s accepted invite', $user->name),
            'project_created' => $project ? sprintf('%s created project "%s"', $user->name, $project->name) : 'Project created',
            'project_updated' => $project ? sprintf('%s updated project "%s"', $user->name, $project->name) : 'Project updated',
            'project_completed' => $project ? sprintf('Project "%s" completed', $project->name) : 'Project completed',
            'report_generated' => sprintf('%s generated report "%s"', $user->name, $metadata['report_title'] ?? $project?->name ?? 'Report'),
            'report_viewed' => sprintf('%s viewed report "%s"', $user->name, $metadata['report_title'] ?? 'Report'),
            'user_activated' => sprintf('%s activated %s %s', $user->name, $metadata['target_role'] ?? 'user', $metadata['target_user_name'] ?? ''),
            'user_deactivated' => sprintf('%s deactivated %s %s', $user->name, $metadata['target_role'] ?? 'user', $metadata['target_user_name'] ?? ''),
            'client_created' => sprintf('%s created client %s', $user->name, $metadata['client_name'] ?? ''),
            default => Str::headline(str_replace('_', ' ', $action)),
        };
    }

    private static function primaryRoleName(User $user): string
    {
        $role = $user->relationLoaded('roles')
            ? $user->roles->pluck('name')->first()
            : $user->roles()->pluck('name')->first();

        return strtolower((string) ($role ?: 'user'));
    }
}
