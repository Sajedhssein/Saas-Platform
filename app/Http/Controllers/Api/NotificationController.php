<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    /**
     * List notifications for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $this->authorize('viewAny', Notification::class);
        $perPage = 20;

        $notifications = NotificationService::visibleQueryForUser($user)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => NotificationResource::collection($notifications),
            'unread_count' => NotificationService::getUnreadCount($user),
            'pagination' => [
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    }

    /**
     * Hide all visible notifications for the authenticated user.
     */
    public function clear(): JsonResponse
    {
        $user = auth()->user();
        $this->authorize('clear', Notification::class);
        NotificationService::clearVisibleForUser($user);

        return response()->json([
            'success' => true,
            'message' => 'Notifications cleared',
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Notification $notification): JsonResponse
    {
        $user = auth()->user();

        $this->authorize('view', $notification);

        NotificationService::markAsRead($notification);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data' => new NotificationResource($notification),
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(): JsonResponse
    {
        $user = auth()->user();
        $this->authorize('markAllAsRead', Notification::class);
        $count = NotificationService::markAllAsRead($user);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
            'updated_count' => $count,
        ]);
    }
}
