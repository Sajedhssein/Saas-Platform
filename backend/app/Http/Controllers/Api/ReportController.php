<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\ReportRangeRequest;
use App\Http\Requests\CustomReportRequest;

class ReportController extends Controller
{
    public function weekly(ReportRangeRequest $request): JsonResponse
    {
        $user = auth()->user();
        $companyId = $user->company_id;

        $end = Carbon::now();
        $start = match ($request->input('range')) {
            'today' => Carbon::now(),
            default => $end->copy()->subDays(6),
        };

        $report = ReportService::generate($companyId, $start, $end, 'weekly');

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    public function monthly(ReportRangeRequest $request): JsonResponse
    {
        $user = auth()->user();
        $companyId = $user->company_id;

        $end = Carbon::now();
        $start = match ($request->input('range')) {
            'today' => Carbon::now(),
            default => $end->copy()->subDays(29),
        };

        $report = ReportService::generate($companyId, $start, $end, 'monthly');

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    public function custom(CustomReportRequest $request): JsonResponse
    {
        $user = auth()->user();
        $companyId = $user->company_id;

        $start = Carbon::parse($request->input('start_date'));
        $end = Carbon::parse($request->input('end_date'));

        $report = ReportService::generate($companyId, $start, $end, 'custom');

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }
}
