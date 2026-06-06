<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    public static function visibleQueryForUser(User $user)
    {
        $query = Notification::query()
            ->where('company_id', $user->company_id)
            ->where('is_hidden', false);

        if ($user->hasRole('admin')) {
            return $query;
        }

        return $query->where('user_id', $user->id);
    }

    public static function notifyCompanyAdminsExcept(
        User $actor,
        string $title,
        string $message,
        string $type,
        ?string $entityType = null,
        ?string $entityId = null,
        array $metadata = []
    ): array {
        $recipients = User::query()
            ->where('company_id', $actor->company_id)
            ->whereKeyNot($actor->id)
            ->whereHas('roles', fn ($query) => $query->whereRaw('lower(name) = ?', ['admin']))
            ->get();

        return static::notifyMany($recipients, $title, $message, $type, $entityType, $entityId, $metadata);
    }

    public static function notifyUser(
        User $recipient,
        string $title,
        string $message,
        string $type,
        ?string $entityType = null,
        ?string $entityId = null,
        array $metadata = []
    ): ?Notification {
        if (! static::shouldSendNotification($recipient, $type)) {
            return null;
        }

        return Notification::create([
            'company_id' => $recipient->company_id,
            'user_id' => $recipient->id,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata' => $metadata,
            'data' => $metadata,
            'is_read' => false,
        ]);
    }

    public static function notifyMany(
        iterable $recipients,
        string $title,
        string $message,
        string $type,
        ?string $entityType = null,
        ?string $entityId = null,
        array $metadata = []
    ): array {
        $created = [];

        $recipientIds = collect($recipients)
            ->map(fn ($recipient) => $recipient instanceof User ? $recipient->id : $recipient)
            ->filter()
            ->unique()
            ->values();

        $normalized = User::query()
            ->with('notificationPreference')
            ->whereIn('id', $recipientIds)
            ->get();

        foreach ($normalized as $recipient) {
            $notification = static::notifyUser($recipient, $title, $message, $type, $entityType, $entityId, $metadata);

            if ($notification) {
                $created[] = $notification;
            }
        }

        return $created;
    }

    public static function create(
        int|string|User $user,
        string $title,
        string $message,
        string $type,
        array $data = []
    ): Notification {
        $recipient = $user instanceof User ? $user : User::query()->findOrFail($user);

        return static::notifyUser($recipient, $title, $message, $type, $data['entity_type'] ?? null, $data['entity_id'] ?? null, $data);
    }

    public static function createForUsers(
        array $userIds,
        string $title,
        string $message,
        string $type,
        array $data = []
    ): void {
        static::notifyMany($userIds, $title, $message, $type, $data['entity_type'] ?? null, $data['entity_id'] ?? null, $data);
    }

    public static function markAsRead(Notification $notification): Notification
    {
        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return $notification;
    }

    public static function markAllAsRead(User $user): int
    {
        return static::visibleQueryForUser($user)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
    }

    public static function getUnreadCount(User $user): int
    {
        return static::visibleQueryForUser($user)
            ->where('is_read', false)
            ->count();
    }

    public static function unreadForCompany(string $companyId): Collection
    {
        return Notification::where('company_id', $companyId)
            ->where('is_hidden', false)
            ->where('is_read', false)
            ->get();
    }

    public static function clearVisibleForUser(User $user): int
    {
        return static::visibleQueryForUser($user)
            ->update(['is_hidden' => true]);
    }

    private static function shouldSendNotification(User $recipient, string $type): bool
    {
        $recipient->loadMissing('notificationPreference');
        $preferences = $recipient->notificationPreference;

        if (! $preferences) {
            return true;
        }

        return match ($type) {
            'task_assigned' => $preferences->task_assigned,
            'task_completed' => $preferences->task_completed,
            'project_updated' => $preferences->project_updated,
            'report_generated' => $preferences->report_generated,
            'employee_joined' => $preferences->employee_joined,
            'invite_accepted' => $preferences->invite_accepted,
            default => true,
        };
    }
}
