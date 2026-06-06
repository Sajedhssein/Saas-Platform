<?php

namespace Tests\Feature\Admin;

use App\Mail\EnterpriseReportMail;
use App\Models\Company;
use App\Models\Project;
use App\Models\Report;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EnterpriseReportTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $admin;
    private User $employee;
    private User $client;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-05-28 12:00:00'));
        Storage::fake('reports');
        Mail::fake();

        $this->company = Company::factory()->create();

        $adminRole = Role::firstOrCreateByName('admin');
        $employeeRole = Role::firstOrCreateByName('employee');
        $clientRole = Role::firstOrCreateByName('client');

        $this->admin = User::factory()->create(['company_id' => $this->company->id]);
        $this->admin->roles()->attach($adminRole);

        $this->employee = User::factory()->create(['company_id' => $this->company->id]);
        $this->employee->roles()->attach($employeeRole);

        $this->client = User::factory()->create(['company_id' => $this->company->id]);
        $this->client->roles()->attach($clientRole);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function createProject(string $name = 'Alpha Project'): Project
    {
        return Project::create([
            'company_id' => $this->company->id,
            'created_by' => $this->admin->id,
            'name' => $name,
            'description' => 'Project description',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-06-30',
            'progress' => 60,
            'budget' => 25000,
        ]);
    }

    private function createTask(Project $project, array $attributes = []): Task
    {
        return Task::create(array_merge([
            'project_id' => $project->id,
            'created_by' => $this->admin->id,
            'title' => 'Task',
            'description' => 'Task description',
            'status' => 'pending',
            'priority' => 'medium',
            'deadline' => Carbon::now()->addDays(2),
        ], $attributes));
    }

    private function generateReport(array $payload): Report
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/admin/reports/generate', $payload);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        return Report::query()->latest()->firstOrFail();
    }

    public function test_generate_company_pdf_report(): void
    {
        $project = $this->createProject();
        $task = $this->createTask($project, [
            'title' => 'Completed task',
            'status' => 'completed',
            'updated_at' => Carbon::now()->subDay(),
            'deadline' => Carbon::now()->subDays(2),
        ]);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $report = $this->generateReport([
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Company Snapshot',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $this->assertSame('company', $report->report_type);
        $this->assertSame('pdf', $report->format);
        $this->assertSame('generated', $report->status);
        $this->assertNotNull($report->generated_at);
        Storage::disk('reports')->assertExists($report->file_path);
        $this->assertStringEndsWith('.pdf', $report->file_path);

        $viewUrl = URL::temporarySignedRoute('admin.reports.view', now()->addDays(7), ['report' => $report->id]);

        $viewResponse = $this->get($viewUrl);

        $viewResponse->assertOk();
        $this->assertSame('application/pdf', $viewResponse->headers->get('Content-Type'));
        $this->assertStringContainsString('inline', $viewResponse->headers->get('Content-Disposition', ''));
    }

    public function test_generate_project_xlsx_report(): void
    {
        $project = $this->createProject('Project Report Project');
        $task = $this->createTask($project, [
            'title' => 'Project task',
            'status' => 'in_progress',
            'deadline' => Carbon::now()->addDay(),
        ]);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $report = $this->generateReport([
            'report_type' => 'project',
            'entity_id' => $project->id,
            'format' => 'xlsx',
            'title' => 'Project Progress Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        Storage::disk('reports')->assertExists($report->file_path);
        $this->assertStringEndsWith('.xlsx', $report->file_path);

        $downloadUrl = URL::temporarySignedRoute('admin.reports.download', now()->addDays(7), ['report' => $report->id]);

        $downloadResponse = $this->get($downloadUrl);

        $downloadResponse->assertOk();
        $this->assertStringContainsString('attachment', $downloadResponse->headers->get('Content-Disposition', ''));
        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $downloadResponse->headers->get('Content-Type'));
    }

    public function test_generate_employee_csv_report(): void
    {
        $project = $this->createProject('Employee Report Project');
        $task = $this->createTask($project, [
            'title' => 'Employee task',
            'status' => 'completed',
            'updated_at' => Carbon::now()->subDay(),
        ]);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $report = $this->generateReport([
            'report_type' => 'employee',
            'entity_id' => $this->employee->id,
            'format' => 'csv',
            'title' => 'Employee Performance Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        Storage::disk('reports')->assertExists($report->file_path);
        $this->assertStringEndsWith('.csv', $report->file_path);

        $downloadUrl = URL::temporarySignedRoute('admin.reports.download', now()->addDays(7), ['report' => $report->id]);

        $downloadResponse = $this->get($downloadUrl);

        $downloadResponse->assertOk();
        $this->assertStringContainsString('attachment', $downloadResponse->headers->get('Content-Disposition', ''));
        $this->assertStringContainsString('text/csv', $downloadResponse->headers->get('Content-Type', ''));
    }

    public function test_generate_client_pdf_report_and_download_view_email_flow(): void
    {
        $project = $this->createProject('Client Report Project');
        $project->users()->attach($this->client->id, ['role' => 'viewer']);
        $task = $this->createTask($project, [
            'title' => 'Client task',
            'status' => 'completed',
            'updated_at' => Carbon::now()->subDay(),
        ]);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $report = $this->generateReport([
            'report_type' => 'client',
            'entity_id' => $this->client->id,
            'format' => 'pdf',
            'title' => 'Client Delivery Report',
            'recipient_email' => 'client@example.com',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $downloadUrl = URL::temporarySignedRoute('admin.reports.download', now()->addDays(7), ['report' => $report->id]);

        $downloadResponse = $this->get($downloadUrl);

        $downloadResponse->assertStatus(200);
        $this->assertStringContainsString('attachment', $downloadResponse->headers->get('Content-Disposition', ''));

        $viewUrl = URL::temporarySignedRoute('admin.reports.view', now()->addDays(7), ['report' => $report->id]);

        $viewResponse = $this->get($viewUrl);

        $viewResponse->assertStatus(200);
        $this->assertStringContainsString('inline', $viewResponse->headers->get('Content-Disposition', ''));
        $this->assertSame('application/pdf', $viewResponse->headers->get('Content-Type'));

        $emailResponse = $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/reports/{$report->id}/email", [
                'email' => 'client@example.com',
            ]);

        $emailResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        Mail::assertSent(EnterpriseReportMail::class, function (EnterpriseReportMail $mail) {
            $html = $mail->render();
            $signedViewUrl = URL::temporarySignedRoute('admin.reports.view', now()->addDays(7), ['report' => $mail->report->id]);

            return $mail->report->title === 'Client Delivery Report'
                && str_contains($html, $signedViewUrl)
                && ! str_contains($html, URL::temporarySignedRoute('admin.reports.download', now()->addDays(7), ['report' => $mail->report->id]));
        });

        $report->refresh();
        $this->assertSame('emailed', $report->status);
        $this->assertNotNull($report->sent_at);

        // Authenticated admin should be able to access the download endpoint directly
        $authDownloadResponse = $this->actingAs($this->admin, 'api')
            ->get("/api/admin/reports/{$report->id}/download");

        $authDownloadResponse->assertStatus(200);
    }

    public function test_signed_pdf_link_works_without_authentication(): void
    {
        $report = $this->generateReport([
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Public PDF Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $url = URL::temporarySignedRoute('admin.reports.view', now()->addDays(7), ['report' => $report->id]);

        $response = $this->get($url);

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_expired_signed_link_returns_clean_message(): void
    {
        $report = $this->generateReport([
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Expired Link Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $expiredUrl = URL::temporarySignedRoute('admin.reports.view', now()->subDay(), ['report' => $report->id]);

        $response = $this->getJson($expiredUrl);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Report link expired',
            ]);
    }

    public function test_missing_report_file_returns_readable_404(): void
    {
        $report = $this->generateReport([
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Missing File Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        Storage::disk('reports')->delete($report->file_path);

        $url = URL::temporarySignedRoute('admin.reports.download', now()->addDays(7), ['report' => $report->id]);

        $response = $this->get($url);

        $response->assertStatus(404);
        $this->assertStringContainsString('Report file not found.', $response->getContent());
    }

    public function test_report_history_is_paginated_and_newest_first(): void
    {
        $firstProject = $this->createProject('History Project One');
        $this->createTask($firstProject, ['status' => 'completed', 'updated_at' => Carbon::now()->subDay()]);

        $firstReport = $this->generateReport([
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Older Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-15',
        ]);

        Carbon::setTestNow(Carbon::now()->addMinute());

        $secondReport = $this->generateReport([
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Newer Report',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $response = $this->actingAs($this->admin, 'api')->getJson('/api/admin/reports');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $secondReport->id)
            ->assertJsonPath('data.1.id', $firstReport->id);
    }

    public function test_non_admin_cannot_access_reports(): void
    {
        $response = $this->actingAs($this->employee, 'api')->getJson('/api/admin/reports');

        $response->assertStatus(403);

        $clientResponse = $this->actingAs($this->client, 'api')->postJson('/api/admin/reports/generate', [
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Should Fail',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $clientResponse->assertStatus(403);
    }

    public function test_company_isolation_blocks_other_company_reports(): void
    {
        $otherCompany = Company::factory()->create();
        $otherAdmin = User::factory()->create(['company_id' => $otherCompany->id]);
        $otherAdmin->roles()->attach(Role::firstOrCreateByName('admin'));

        $otherProject = Project::create([
            'company_id' => $otherCompany->id,
            'created_by' => $otherAdmin->id,
            'name' => 'Other Company Project',
            'description' => 'Hidden project',
            'status' => 'active',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'progress' => 40,
            'budget' => 1000,
        ]);

        $otherReport = $this->actingAs($otherAdmin, 'api')
            ->postJson('/api/admin/reports/generate', [
                'report_type' => 'project',
                'entity_id' => $otherProject->id,
                'format' => 'pdf',
                'title' => 'Other Company Report',
                'start_date' => '2026-05-01',
                'end_date' => '2026-05-31',
            ]);

        $otherReport->assertStatus(201);
        $otherReportId = $otherReport->json('data.id');

        $response = $this->actingAs($this->admin, 'api')->getJson("/api/admin/reports/{$otherReportId}");
        $response->assertStatus(404);
    }

    public function test_email_link_uses_download_for_csv_reports(): void
    {
        $project = $this->createProject('CSV Email Project');
        $task = $this->createTask($project, ['status' => 'completed']);
        $task->users()->attach($this->employee->id, ['role' => 'assignee']);

        $report = $this->generateReport([
            'report_type' => 'employee',
            'entity_id' => $this->employee->id,
            'format' => 'csv',
            'title' => 'CSV Email Report',
            'recipient_email' => 'client@example.com',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/admin/reports/{$report->id}/email", [
                'email' => 'client@example.com',
            ])
            ->assertOk();

        Mail::assertSent(EnterpriseReportMail::class, function (EnterpriseReportMail $mail) use ($report) {
            $html = $mail->render();

            return $mail->report->id === $report->id
                && str_contains($html, route('admin.reports.download', $report->id))
                && ! str_contains($html, route('admin.reports.view', $report->id));
        });
    }

    public function test_validation_errors_are_returned_for_missing_entity_and_invalid_dates(): void
    {
        $missingEntity = $this->actingAs($this->admin, 'api')->postJson('/api/admin/reports/generate', [
            'report_type' => 'project',
            'format' => 'pdf',
            'title' => 'Missing Entity',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
        ]);

        $missingEntity->assertStatus(422)
            ->assertJsonValidationErrors(['entity_id']);

        $invalidDates = $this->actingAs($this->admin, 'api')->postJson('/api/admin/reports/generate', [
            'report_type' => 'company',
            'format' => 'pdf',
            'title' => 'Invalid Dates',
            'start_date' => '2026-05-31',
            'end_date' => '2026-05-01',
        ]);

        $invalidDates->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }
}
