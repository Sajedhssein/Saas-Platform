<?php

namespace App\Services\Reports;

use App\Mail\EnterpriseReportMail;
use App\Models\Company;
use App\Models\Project;
use App\Models\Report;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PharData;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class EnterpriseReportService
{
    public function generate(array $payload, User $user): Report
    {
        $start = Carbon::parse($payload['start_date']);
        $end = Carbon::parse($payload['end_date']);
        $reportType = $payload['report_type'];
        $format = $payload['format'];
        $title = $payload['title'];
        $entityId = $payload['entity_id'] ?? null;
        $recipientEmail = $payload['recipient_email'] ?? null;

        $reportData = $this->buildReportData($user->company_id, $reportType, $entityId, $start, $end, $title);

        $fileName = $this->buildFileName($reportType, $format);
        $filePath = $this->storeFile($fileName, $format, $reportData);

        return Report::create([
            'company_id' => $user->company_id,
            'created_by' => $user->id,
            'report_type' => $reportType,
            'entity_id' => $entityId,
            'format' => $format,
            'title' => $title,
            'file_path' => $filePath,
            'recipient_email' => $recipientEmail,
            'status' => 'generated',
            'generated_at' => now(),
        ])->load('creator');
    }

    public function download(Report $report): Response
    {
        return Storage::disk('reports')->download(
            $report->file_path,
            basename($report->file_path),
            $this->responseHeadersFor($report)
        );
    }

    public function view(Report $report): Response
    {
        if ($report->format === 'pdf') {
            return Storage::disk('reports')->response(
                $report->file_path,
                basename($report->file_path),
                $this->responseHeadersFor($report),
                'inline'
            );
        }

        return $this->download($report);
    }

    public function email(Report $report, string $email): Report
    {
        try {
            $mailable = new EnterpriseReportMail($report->fresh(), $email);
            Mail::to($email)->send($mailable);

            $report->forceFill([
                'recipient_email' => $email,
                'status' => 'emailed',
                'sent_at' => now(),
            ])->save();
        } catch (Throwable $throwable) {
            $report->forceFill([
                'recipient_email' => $email,
                'status' => 'failed',
            ])->save();

            throw $throwable;
        }

        return $report->refresh()->load('creator');
    }

    public function delete(Report $report): void
    {
        if ($report->file_path && Storage::disk('reports')->exists($report->file_path)) {
            Storage::disk('reports')->delete($report->file_path);
        }

        $report->delete();
    }

    private function storeFile(string $fileName, string $format, array $reportData): string
    {
        return match ($format) {
            'pdf' => $this->storePdf($fileName, $reportData),
            'xlsx' => $this->storeXlsx($fileName, $reportData),
            'csv' => $this->storeCsv($fileName, $reportData),
            default => throw new RuntimeException('Unsupported report format.'),
        };
    }

    private function storePdf(string $fileName, array $reportData): string
    {
        $content = Pdf::loadView('reports.pdf.enterprise', [
            'report' => $reportData,
        ])->setPaper('a4', 'portrait')->output();

        Storage::disk('reports')->put($fileName, $content);

        return $fileName;
    }

    private function storeCsv(string $fileName, array $reportData): string
    {
        $rows = $this->buildSpreadsheetRows($reportData);
        $csv = $this->rowsToCsv($rows);

        Storage::disk('reports')->put($fileName, $csv);

        return $fileName;
    }

    private function storeXlsx(string $fileName, array $reportData): string
    {
        $rows = $this->buildSpreadsheetRows($reportData);
        $absolutePath = Storage::disk('reports')->path($fileName);
        $tempZipPath = tempnam(sys_get_temp_dir(), 'enterprise_report_');

        if ($tempZipPath === false) {
            throw new RuntimeException('Unable to create temporary file for XLSX export.');
        }

        $zipPath = $tempZipPath.'.zip';
        @unlink($tempZipPath);
        @unlink($zipPath);

        $archive = new PharData($zipPath);
        $archive['[Content_Types].xml'] = $this->xlsxContentTypesXml();
        $archive['_rels/.rels'] = $this->xlsxRootRelsXml();
        $archive['docProps/app.xml'] = $this->xlsxAppXml($reportData);
        $archive['docProps/core.xml'] = $this->xlsxCoreXml($reportData);
        $archive['xl/workbook.xml'] = $this->xlsxWorkbookXml($reportData);
        $archive['xl/_rels/workbook.xml.rels'] = $this->xlsxWorkbookRelsXml();
        $archive['xl/styles.xml'] = $this->xlsxStylesXml();
        $archive['xl/worksheets/sheet1.xml'] = $this->xlsxWorksheetXml($rows);

        copy($zipPath, $absolutePath);
        @unlink($zipPath);

        return $fileName;
    }

    private function responseHeadersFor(Report $report): array
    {
        return [
            'Content-Type' => $this->mimeTypeFor($report->format),
        ];
    }

    private function mimeTypeFor(string $format): string
    {
        return match ($format) {
            'pdf' => 'application/pdf',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv' => 'text/csv',
            default => 'application/octet-stream',
        };
    }

    private function buildFileName(string $reportType, string $format): string
    {
        return Str::slug($reportType, '-') . '_' . now()->format('Ymd_His') . '.' . $format;
    }

    private function buildReportData(string $companyId, string $reportType, ?string $entityId, Carbon $start, Carbon $end, string $title): array
    {
        $company = Company::query()->findOrFail($companyId);

        return match ($reportType) {
            'company' => $this->buildCompanyReportData($company, $start, $end, $title),
            'project' => $this->buildProjectReportData($company, $entityId, $start, $end, $title),
            'employee' => $this->buildEmployeeReportData($company, $entityId, $start, $end, $title),
            'client' => $this->buildClientReportData($company, $entityId, $start, $end, $title),
            default => throw new RuntimeException('Unsupported report type.'),
        };
    }

    private function buildCompanyReportData(Company $company, Carbon $start, Carbon $end, string $title): array
    {
        $projectQuery = Project::query()->where('company_id', $company->id)->dateRange($start, $end, 'created_at');
        $taskQuery = Task::query()->whereHas('project', fn ($query) => $query->where('company_id', $company->id))->dateRange($start, $end, 'created_at');
        $employeeQuery = User::query()
            ->where('company_id', $company->id)
            ->whereHas('roles', fn ($query) => $query->whereRaw('LOWER(name) = ?', [Role::EMPLOYEE]));

        $projectsTotal = (clone $projectQuery)->count();
        $projectsActive = (clone $projectQuery)->where('status', 'active')->count();
        $projectsCompleted = (clone $projectQuery)->where('status', 'completed')->count();

        $tasksTotal = (clone $taskQuery)->count();
        $tasksCompleted = (clone $taskQuery)->where('status', 'completed')->count();
        $tasksInProgress = (clone $taskQuery)->where('status', 'in_progress')->count();
        $tasksPending = (clone $taskQuery)->where('status', 'pending')->count();
        $tasksOverdue = (clone $taskQuery)
            ->whereNotNull('deadline')
            ->where('deadline', '<', now())
            ->where('status', '!=', 'completed')
            ->count();

        $topPerformers = DB::table('task_users')
            ->join('tasks', 'task_users.task_id', '=', 'tasks.id')
            ->join('projects', 'tasks.project_id', '=', 'projects.id')
            ->join('users', 'task_users.user_id', '=', 'users.id')
            ->join('user_roles', 'users.id', '=', 'user_roles.user_id')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('projects.company_id', $company->id)
            ->whereRaw('LOWER(roles.name) = ?', [Role::EMPLOYEE])
            ->where('tasks.status', 'completed')
            ->whereBetween('tasks.updated_at', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->groupBy('users.id', 'users.name')
            ->orderByRaw('COUNT(*) DESC')
            ->limit(5)
            ->get([
                'users.id',
                'users.name',
                DB::raw('COUNT(*) as completed_tasks'),
            ])
            ->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'completed_tasks' => (int) $row->completed_tasks,
            ])
            ->values()
            ->all();

        $projectRows = $projectQuery->orderByDesc('progress')->limit(10)->get()->map(fn (Project $project) => [
            'id' => $project->id,
            'name' => $project->name,
            'status' => $project->status,
            'progress' => $project->progress,
            'budget' => (string) $project->budget,
        ])->all();

        $deadlineRows = $taskQuery->whereNotNull('deadline')
            ->orderBy('deadline')
            ->limit(10)
            ->get(['id', 'title', 'deadline', 'status'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'deadline' => optional($task->deadline)->toDateTimeString(),
                'status' => $task->status,
            ])->all();

        return $this->assembleReport(
            $company,
            $title,
            $start,
            $end,
            [
                ['label' => 'Projects', 'value' => $projectsTotal],
                ['label' => 'Active Projects', 'value' => $projectsActive],
                ['label' => 'Completed Projects', 'value' => $projectsCompleted],
                ['label' => 'Employees', 'value' => $employeeQuery->count()],
                ['label' => 'Tasks', 'value' => $tasksTotal],
                ['label' => 'Completion %', 'value' => $tasksTotal > 0 ? (int) round(($tasksCompleted / $tasksTotal) * 100) : 0],
            ],
            [
                [
                    'title' => 'Top Performers',
                    'headers' => ['Employee', 'Completed Tasks'],
                    'rows' => array_map(fn ($row) => [$row['name'], $row['completed_tasks']], $topPerformers),
                ],
                [
                    'title' => 'Projects',
                    'headers' => ['Name', 'Status', 'Progress', 'Budget'],
                    'rows' => array_map(fn ($row) => [$row['name'], $row['status'], $row['progress'], $row['budget']], $projectRows),
                ],
                [
                    'title' => 'Deadlines',
                    'headers' => ['Title', 'Deadline', 'Status'],
                    'rows' => array_map(fn ($row) => [$row['title'], $row['deadline'], $row['status']], $deadlineRows),
                ],
            ],
            [
                'projects' => [
                    'total' => $projectsTotal,
                    'active' => $projectsActive,
                    'completed' => $projectsCompleted,
                ],
                'tasks' => [
                    'total' => $tasksTotal,
                    'completed' => $tasksCompleted,
                    'in_progress' => $tasksInProgress,
                    'pending' => $tasksPending,
                    'overdue' => $tasksOverdue,
                    'completion_rate' => $tasksTotal > 0 ? (int) round(($tasksCompleted / $tasksTotal) * 100) : 0,
                ],
                'employees' => [
                    'total' => $employeeQuery->count(),
                    'top_performers' => $topPerformers,
                ],
            ]
        );
    }

    private function buildProjectReportData(Company $company, ?string $entityId, Carbon $start, Carbon $end, string $title): array
    {
        $project = Project::query()
            ->where('company_id', $company->id)
            ->with(['creator:id,name,email'])
            ->findOrFail($entityId);

        $tasksQuery = Task::query()
            ->where('project_id', $project->id)
            ->dateRange($start, $end, 'created_at');

        $tasksTotal = (clone $tasksQuery)->count();
        $tasksCompleted = (clone $tasksQuery)->where('status', 'completed')->count();
        $tasksInProgress = (clone $tasksQuery)->where('status', 'in_progress')->count();
        $tasksPending = (clone $tasksQuery)->where('status', 'pending')->count();
        $tasksOverdue = (clone $tasksQuery)
            ->whereNotNull('deadline')
            ->where('deadline', '<', now())
            ->where('status', '!=', 'completed')
            ->count();

        $completionRate = $tasksTotal > 0 ? (int) round(($tasksCompleted / $tasksTotal) * 100) : 0;

        $assignedEmployees = DB::table('task_users')
            ->join('tasks', 'task_users.task_id', '=', 'tasks.id')
            ->join('users', 'task_users.user_id', '=', 'users.id')
            ->join('user_roles', 'users.id', '=', 'user_roles.user_id')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('tasks.project_id', $project->id)
            ->whereRaw('LOWER(roles.name) = ?', [Role::EMPLOYEE])
            ->distinct('users.id')
            ->count('users.id');

        $uploadedFiles = TaskFile::query()
            ->whereHas('task', fn ($query) => $query->where('project_id', $project->id))
            ->count();

        $taskRows = $tasksQuery->orderBy('deadline')->limit(20)->get()->map(fn (Task $task) => [
            'title' => $task->title,
            'status' => $task->status,
            'priority' => $task->priority,
            'progress' => $task->progress,
            'deadline' => optional($task->deadline)->toDateTimeString(),
        ])->all();

        $assigneeRows = DB::table('task_users')
            ->join('tasks', 'task_users.task_id', '=', 'tasks.id')
            ->join('users', 'task_users.user_id', '=', 'users.id')
            ->where('tasks.project_id', $project->id)
            ->groupBy('users.id', 'users.name')
            ->orderBy('users.name')
            ->limit(20)
            ->get([
                'users.name',
                DB::raw('COUNT(*) as assignments'),
            ])
            ->map(fn ($row) => [$row->name, (int) $row->assignments])
            ->all();

        $fileRows = TaskFile::query()
            ->whereHas('task', fn ($query) => $query->where('project_id', $project->id))
            ->latest()
            ->limit(20)
            ->get(['file_name', 'file_type', 'file_size', 'created_at'])
            ->map(fn (TaskFile $file) => [
                'name' => $file->file_name,
                'type' => $file->file_type,
                'size' => $file->file_size,
                'uploaded_at' => optional($file->created_at)->toDateTimeString(),
            ])->all();

        return $this->assembleReport(
            $company,
            $title,
            $start,
            $end,
            [
                ['label' => 'Project Progress', 'value' => $project->progress],
                ['label' => 'Tasks', 'value' => $tasksTotal],
                ['label' => 'Completed', 'value' => $tasksCompleted],
                ['label' => 'Completion %', 'value' => $completionRate],
                ['label' => 'Assigned Employees', 'value' => $assignedEmployees],
                ['label' => 'Uploaded Files', 'value' => $uploadedFiles],
            ],
            [
                [
                    'title' => 'Tasks',
                    'headers' => ['Title', 'Status', 'Priority', 'Progress', 'Deadline'],
                    'rows' => array_map(fn ($row) => [$row['title'], $row['status'], $row['priority'], $row['progress'], $row['deadline']], $taskRows),
                ],
                [
                    'title' => 'Assigned Employees',
                    'headers' => ['Employee', 'Assignments'],
                    'rows' => $assigneeRows,
                ],
                [
                    'title' => 'Uploaded Files',
                    'headers' => ['File', 'Type', 'Size', 'Uploaded At'],
                    'rows' => array_map(fn ($row) => [$row['name'], $row['type'], $row['size'], $row['uploaded_at']], $fileRows),
                ],
                [
                    'title' => 'Timeline',
                    'headers' => ['Milestone', 'Date'],
                    'rows' => [
                        ['Created', optional($project->created_at)->toDateTimeString()],
                        ['Updated', optional($project->updated_at)->toDateTimeString()],
                        ['Start Date', optional($project->start_date)?->toDateString()],
                        ['End Date', optional($project->end_date)?->toDateString()],
                    ],
                ],
            ],
            [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'status' => $project->status,
                    'progress' => $project->progress,
                ],
                'tasks' => [
                    'total' => $tasksTotal,
                    'completed' => $tasksCompleted,
                    'in_progress' => $tasksInProgress,
                    'pending' => $tasksPending,
                    'overdue' => $tasksOverdue,
                    'completion_rate' => $completionRate,
                ],
                'employees' => [
                    'total' => $assignedEmployees,
                ],
            ]
        );
    }

    private function buildEmployeeReportData(Company $company, ?string $entityId, Carbon $start, Carbon $end, string $title): array
    {
        $employee = User::query()
            ->where('company_id', $company->id)
            ->with(['roles:id,name'])
            ->whereHas('roles', fn ($query) => $query->whereRaw('LOWER(name) = ?', [Role::EMPLOYEE]))
            ->findOrFail($entityId);

        $tasksQuery = Task::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $employee->id))
            ->dateRange($start, $end, 'created_at');

        $tasksTotal = (clone $tasksQuery)->count();
        $tasksCompleted = (clone $tasksQuery)->where('status', 'completed')->count();
        $tasksInProgress = (clone $tasksQuery)->where('status', 'in_progress')->count();
        $tasksPending = (clone $tasksQuery)->where('status', 'pending')->count();
        $tasksOverdue = (clone $tasksQuery)
            ->whereNotNull('deadline')
            ->where('deadline', '<', now())
            ->where('status', '!=', 'completed')
            ->count();

        $performance = $tasksTotal > 0 ? (int) round(($tasksCompleted / $tasksTotal) * 100) : 0;
        $workload = [
            ['label' => 'Total Tasks', 'value' => $tasksTotal],
            ['label' => 'High Priority', 'value' => (clone $tasksQuery)->where('priority', 'high')->count()],
            ['label' => 'Medium Priority', 'value' => (clone $tasksQuery)->where('priority', 'medium')->count()],
            ['label' => 'Low Priority', 'value' => (clone $tasksQuery)->where('priority', 'low')->count()],
        ];

        $taskRows = $tasksQuery->orderByDesc('created_at')->limit(20)->get(['title', 'status', 'priority', 'progress', 'deadline'])->map(fn (Task $task) => [
            $task->title,
            $task->status,
            $task->priority,
            $task->progress,
            optional($task->deadline)->toDateTimeString(),
        ])->all();

        return $this->assembleReport(
            $company,
            $title,
            $start,
            $end,
            [
                ['label' => 'Assigned Tasks', 'value' => $tasksTotal],
                ['label' => 'Completed Tasks', 'value' => $tasksCompleted],
                ['label' => 'Pending Tasks', 'value' => $tasksPending],
                ['label' => 'Overdue Tasks', 'value' => $tasksOverdue],
                ['label' => 'Performance %', 'value' => $performance],
            ],
            [
                [
                    'title' => 'Assigned Tasks',
                    'headers' => ['Title', 'Status', 'Priority', 'Progress', 'Deadline'],
                    'rows' => $taskRows,
                ],
                [
                    'title' => 'Workload',
                    'headers' => ['Metric', 'Value'],
                    'rows' => array_map(fn ($row) => [$row['label'], $row['value']], $workload),
                ],
            ],
            [
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'email' => $employee->email,
                    'position' => $employee->position,
                ],
                'tasks' => [
                    'assigned' => $tasksTotal,
                    'completed' => $tasksCompleted,
                    'pending' => $tasksPending,
                    'overdue' => $tasksOverdue,
                    'performance_percentage' => $performance,
                ],
                'workload' => $workload,
            ]
        );
    }

    private function buildClientReportData(Company $company, ?string $entityId, Carbon $start, Carbon $end, string $title): array
    {
        $client = User::query()
            ->where('company_id', $company->id)
            ->with(['projects:id,name,progress,status', 'roles:id,name'])
            ->whereHas('roles', fn ($query) => $query->whereRaw('LOWER(name) = ?', [Role::CLIENT]))
            ->findOrFail($entityId);

        $projectIds = $client->projects()->pluck('projects.id');

        $projectQuery = Project::query()
            ->whereIn('id', $projectIds)
            ->dateRange($start, $end, 'created_at');

        $projectsTotal = (clone $projectQuery)->count();
        $projectsProgress = (int) round((float) ((clone $projectQuery)->avg('progress') ?? 0));

        $taskQuery = Task::query()
            ->whereIn('project_id', $projectIds)
            ->dateRange($start, $end, 'created_at');

        $tasksCompleted = (clone $taskQuery)->where('status', 'completed')->count();
        $deadlines = (clone $taskQuery)
            ->whereNotNull('deadline')
            ->orderBy('deadline')
            ->limit(20)
            ->get(['title', 'deadline', 'status'])
            ->map(fn (Task $task) => [
                $task->title,
                optional($task->deadline)->toDateTimeString(),
                $task->status,
            ])->all();

        $files = TaskFile::query()
            ->whereHas('task', fn ($query) => $query->whereIn('project_id', $projectIds))
            ->latest()
            ->limit(20)
            ->get(['file_name', 'file_type', 'file_size', 'created_at'])
            ->map(fn (TaskFile $file) => [
                $file->file_name,
                $file->file_type,
                $file->file_size,
                optional($file->created_at)->toDateTimeString(),
            ])->all();

        $projectRows = $projectQuery->orderByDesc('progress')->limit(20)->get(['name', 'status', 'progress', 'updated_at'])->map(fn (Project $project) => [
            $project->name,
            $project->status,
            $project->progress,
            optional($project->updated_at)->toDateTimeString(),
        ])->all();

        return $this->assembleReport(
            $company,
            $title,
            $start,
            $end,
            [
                ['label' => 'Projects', 'value' => $projectsTotal],
                ['label' => 'Average Project Progress', 'value' => $projectsProgress],
                ['label' => 'Completed Tasks', 'value' => $tasksCompleted],
                ['label' => 'Delivered Files', 'value' => count($files)],
            ],
            [
                [
                    'title' => 'Projects',
                    'headers' => ['Name', 'Status', 'Progress', 'Updated At'],
                    'rows' => $projectRows,
                ],
                [
                    'title' => 'Delivered Files',
                    'headers' => ['File', 'Type', 'Size', 'Uploaded At'],
                    'rows' => $files,
                ],
                [
                    'title' => 'Deadlines',
                    'headers' => ['Task', 'Deadline', 'Status'],
                    'rows' => $deadlines,
                ],
            ],
            [
                'client' => [
                    'id' => $client->id,
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                ],
                'projects' => [
                    'total' => $projectsTotal,
                    'average_progress' => $projectsProgress,
                ],
                'tasks' => [
                    'completed' => $tasksCompleted,
                ],
                'files' => count($files),
            ]
        );
    }

    private function assembleReport(
        Company $company,
        string $title,
        Carbon $start,
        Carbon $end,
        array $summaryCards,
        array $sections,
        array $metrics
    ): array {
        return [
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'email' => $company->email,
                'phone' => $company->phone,
            ],
            'title' => $title,
            'period' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'label' => $start->toDateString() . ' to ' . $end->toDateString(),
            ],
            'generated_at' => now()->toDateTimeString(),
            'summary_cards' => $summaryCards,
            'sections' => $sections,
            'metrics' => $metrics,
        ];
    }

    private function buildSpreadsheetRows(array $reportData): array
    {
        $rows = [
            [$reportData['title']],
            ['Company', $reportData['company']['name'], 'Period', $reportData['period']['label']],
            ['Generated At', $reportData['generated_at']],
            [],
        ];

        foreach ($reportData['summary_cards'] as $card) {
            $rows[] = [$card['label'], $card['value']];
        }

        foreach ($reportData['sections'] as $section) {
            $rows[] = [];
            $rows[] = [$section['title']];
            $rows[] = $section['headers'];

            foreach ($section['rows'] as $row) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    private function rowsToCsv(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');

        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return "\xEF\xBB\xBF" . ($csv ?: '');
    }

    private function xlsxWorksheetXml(array $rows): string
    {
        $sheetRows = '';

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 1;
            $cells = '';

            foreach (array_values($row) as $columnIndex => $value) {
                $column = $this->columnLetter($columnIndex + 1);
                $cellReference = $column . $rowNumber;

                if ($value === null || $value === '') {
                    continue;
                }

                if (is_numeric($value)) {
                    $cells .= '<c r="' . $cellReference . '"><v>' . $this->xmlEscape((string) $value) . '</v></c>';
                } else {
                    $cells .= '<c r="' . $cellReference . '" t="inlineStr"><is><t xml:space="preserve">' . $this->xmlEscape((string) $value) . '</t></is></c>';
                }
            }

            if ($cells !== '') {
                $sheetRows .= '<row r="' . $rowNumber . '">' . $cells . '</row>';
            }
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetData>' . $sheetRows . '</sheetData>'
            . '</worksheet>';
    }

    private function xlsxWorkbookXml(array $reportData): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function xlsxWorkbookRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '</Relationships>';
    }

    private function xlsxRootRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            . '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            . '</Relationships>';
    }

    private function xlsxContentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/[Content_Types].xml" ContentType="application/vnd.openxmlformats-package.content-types+xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            . '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            . '</Types>';
    }

    private function xlsxStylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>'
            . '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
            . '</styleSheet>';
    }

    private function xlsxAppXml(array $reportData): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
            . '<Application>Laravel</Application>'
            . '<DocSecurity>0</DocSecurity>'
            . '<ScaleCrop>false</ScaleCrop>'
            . '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>'
            . '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Report</vt:lpstr></vt:vector></TitlesOfParts>'
            . '</Properties>';
    }

    private function xlsxCoreXml(array $reportData): string
    {
        $now = now()->toAtomString();

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            . '<dc:title>' . $this->xmlEscape($reportData['title']) . '</dc:title>'
            . '<dc:creator>Laravel</dc:creator>'
            . '<cp:lastModifiedBy>Laravel</cp:lastModifiedBy>'
            . '<dcterms:created xsi:type="dcterms:W3CDTF">' . $now . '</dcterms:created>'
            . '<dcterms:modified xsi:type="dcterms:W3CDTF">' . $now . '</dcterms:modified>'
            . '</cp:coreProperties>';
    }

    private function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }

    private function columnLetter(int $index): string
    {
        $letter = '';

        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)) . $letter;
            $index = intdiv($index, 26);
        }

        return $letter;
    }
}
