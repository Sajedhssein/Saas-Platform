<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        $this->authorize('viewAny', Report::class);

        $reports = Report::query()
            ->forCompany($user->company_id)
            ->where('recipient_email', $user->email)
            ->orderByDesc('generated_at')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => ReportResource::collection($reports),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    public function show(Report $report): JsonResponse
    {
        $user = auth('api')->user();

        if ($report->company_id !== $user->company_id || strcasecmp((string) $report->recipient_email, (string) $user->email) !== 0) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $this->authorize('view', $report);
        ActivityLogService::logReportViewed($user, $report);

        return response()->json([
            'success' => true,
            'data' => new ReportResource($report->load('creator')),
        ]);
    }
}
