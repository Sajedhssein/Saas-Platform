<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Report;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function show(): JsonResponse
    {
        $user = auth('api')->user();

        // Get projects for the client (company scoped)
        $projectsQuery = Project::query()
            ->where('company_id', $user->company_id)
            ->where(function ($query) use ($user) {
                $query->where('client_id', $user->id)
                    ->orWhereHas('users', fn ($pivotQuery) => $pivotQuery->whereKey($user->id));
            });

        $projects = $projectsQuery->get();

        $projectsCount = $projectsQuery->count();
        $activeProjects = $projectsQuery->where('status', 'active')->count();
        $completedProjects = $projectsQuery->where('status', 'completed')->count();

        // Get reports for the client (company scoped, recipient is the client)
        $reportsQuery = Report::query()
            ->where('company_id', $user->company_id)
            ->where('recipient_email', $user->email);

        $reports = $reportsQuery
            ->orderByDesc('generated_at')
            ->orderByDesc('created_at')
            ->get();

        $reportsCount = $reportsQuery->count();

        // Get recent projects (last 5, ordered by creation date)
        $recentProjects = $projects
            ->sortByDesc('created_at')
            ->take(5)
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'progress' => $project->progress,
                'created_at' => $project->created_at,
            ])
            ->values();

        // Get recent reports (last 5)
        $recentReports = $reports
            ->take(5)
            ->map(fn ($report) => [
                'id' => $report->id,
                'title' => $report->title,
                'report_type' => $report->report_type,
                'status' => $report->status,
                'generated_at' => $report->generated_at,
            ])
            ->values();

        return response()->json([
            'projects_count' => $projectsCount,
            'active_projects' => $activeProjects,
            'completed_projects' => $completedProjects,
            'reports_count' => $reportsCount,
            'recent_projects' => $recentProjects,
            'recent_reports' => $recentReports,
        ], 200);
    }
}
