<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\GenerateReportRequest;
use App\Http\Requests\Admin\SendReportEmailRequest;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use App\Services\Reports\EnterpriseReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ReportController extends Controller
{
    public function __construct(private readonly EnterpriseReportService $reportService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Report::class);
        $reports = Report::query()
            ->forCompany(auth()->user()->company_id)
            ->with(['creator:id,name,email'])
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

    public function generate(GenerateReportRequest $request): JsonResponse
    {
        $this->authorize('create', Report::class);
        $report = $this->reportService->generate(
            $request->validated(),
            auth()->user()
        );

        ActivityLogService::logReportGenerated(auth()->user(), $report);
        NotificationService::notifyUser(
            auth()->user(),
            'Report Generated',
            "Report {$report->title} has been generated",
            'report_generated',
            'report',
            $report->id,
            ['report_title' => $report->title]
        );

        return response()->json([
            'success' => true,
            'data' => new ReportResource($report->load('creator')),
        ], 201);
    }

    public function show(Report $report): JsonResponse
    {
        // Debug: log authenticated user and roles before authorization
        try {
            $user = auth('api')->user() ?? auth()->user();
            Log::debug('AdminReportController@show auth user', [
                'id' => $user?->id,
                'email' => $user?->email,
                'roles' => $user?->roles->pluck('name')->toArray() ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::debug('AdminReportController@show auth user unavailable', ['error' => $e->getMessage()]);
        }

        $this->authorizeReportAccess($report);
        $this->authorize('view', $report);
        ActivityLogService::logReportViewed(auth()->user(), $report);

        return response()->json([
            'success' => true,
            'data' => new ReportResource($report->load('creator')),
        ]);
    }

    public function download(Report $report): BinaryFileResponse|Response
    {
        // log auth user for debugging
        try {
            $user = auth('api')->user() ?? auth()->user();
            Log::debug('AdminReportController@download auth user', [
                'id' => $user?->id,
                'email' => $user?->email,
                'roles' => $user?->roles->pluck('name')->toArray() ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::debug('AdminReportController@download auth user unavailable', ['error' => $e->getMessage()]);
        }

        // Handle signed URL access first
        if (request()->hasValidSignature()) {
            $this->ensureReportFileExists($report);

            return $this->reportService->download($report);
        }

        if (request()->query('signature') || request()->query('expires')) {
            throw new InvalidSignatureException();
        }

        // Otherwise require authenticated admin from same company
        $user = auth('api')->user() ?? auth()->user();

        $isAdmin = $user?->hasRole('admin') ? true : false;
        $companyMatch = $user?->company_id === $report->company_id;

        Log::debug('AdminReportController@download auth checks', [
            'user_id' => $user?->id ?? null,
            'is_admin' => $isAdmin,
            'user_company_id' => $user?->company_id ?? null,
            'report_company_id' => $report->company_id,
            'company_match' => $companyMatch,
        ]);

        if (! $user || ! $isAdmin || ! $companyMatch) {
            Log::warning('AdminReportController@download unauthorized', [
                'report_company_id' => $report->company_id,
                'user_id' => $user?->id ?? null,
                'user_company_id' => $user?->company_id ?? null,
                'user_roles' => $user?->roles->pluck('name')->toArray() ?? [],
                'is_admin' => $isAdmin,
                'company_match' => $companyMatch,
            ]);

            abort(Response::HTTP_FORBIDDEN);
        }

        $this->ensureReportFileExists($report);

        return $this->reportService->download($report);
    }

    public function view(Report $report): BinaryFileResponse|Response
    {
        // Signed links may be used without auth
        if (request()->hasValidSignature()) {
            $this->ensureReportFileExists($report);

            return $this->reportService->view($report);
        }

        if (request()->query('signature') || request()->query('expires')) {
            throw new InvalidSignatureException();
        }

        $user = auth('api')->user() ?? auth()->user();

        $isAdmin = $user?->hasRole('admin') ? true : false;
        $companyMatch = $user?->company_id === $report->company_id;

        Log::debug('AdminReportController@view auth checks', [
            'user_id' => $user?->id ?? null,
            'is_admin' => $isAdmin,
            'user_company_id' => $user?->company_id ?? null,
            'report_company_id' => $report->company_id,
            'company_match' => $companyMatch,
        ]);

        if (! $user || ! $isAdmin || ! $companyMatch) {
            Log::warning('AdminReportController@view unauthorized', [
                'report_company_id' => $report->company_id,
                'user_id' => $user?->id ?? null,
                'user_company_id' => $user?->company_id ?? null,
                'user_roles' => $user?->roles->pluck('name')->toArray() ?? [],
                'is_admin' => $isAdmin,
                'company_match' => $companyMatch,
            ]);

            abort(Response::HTTP_FORBIDDEN);
        }

        $this->ensureReportFileExists($report);
        ActivityLogService::logReportViewed($user, $report);

        return $this->reportService->view($report);
    }

    public function email(SendReportEmailRequest $request, Report $report): JsonResponse
    {
        try {
            $user = auth('api')->user() ?? auth()->user();
            Log::debug('AdminReportController@email auth user', [
                'id' => $user?->id,
                'email' => $user?->email,
                'roles' => $user?->roles->pluck('name')->toArray() ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::debug('AdminReportController@email auth user unavailable', ['error' => $e->getMessage()]);
        }

        $this->authorizeReportAccess($report);
        $this->authorize('email', $report);

        try {
            $updatedReport = $this->reportService->email($report, $request->validated()['email']);
        } catch (Throwable $throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to email report at this time.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => new ReportResource($updatedReport->load('creator')),
        ]);
    }

    public function destroy(Report $report): JsonResponse
    {
        try {
            $user = auth('api')->user() ?? auth()->user();
            Log::debug('AdminReportController@destroy auth user', [
                'id' => $user?->id,
                'email' => $user?->email,
                'roles' => $user?->roles->pluck('name')->toArray() ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::debug('AdminReportController@destroy auth user unavailable', ['error' => $e->getMessage()]);
        }

        $this->authorizeReportAccess($report);
        $this->authorize('delete', $report);

        $this->reportService->delete($report);

        return response()->json([
            'success' => true,
            'message' => 'Report deleted successfully.',
        ]);
    }

    private function authorizeReportAccess(Report $report): void
    {
        abort_unless($report->company_id === auth()->user()->company_id, 404);
    }

    private function ensureReportFileExists(Report $report): void
    {
        abort_unless($report->file_path, 404, 'Report file not found.');
        abort_unless(Storage::disk('reports')->exists($report->file_path), 404, 'Report file not found.');
    }
}
