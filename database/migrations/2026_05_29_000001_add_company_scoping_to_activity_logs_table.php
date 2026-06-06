<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table): void {
            if (! Schema::hasColumn('activity_logs', 'company_id')) {
                $table->uuid('company_id')->nullable()->index()->after('id');
            }

            if (! Schema::hasColumn('activity_logs', 'project_id')) {
                $table->uuid('project_id')->nullable()->index()->after('company_id');
            }

            if (! Schema::hasColumn('activity_logs', 'task_id')) {
                $table->uuid('task_id')->nullable()->index()->after('project_id');
            }

            if (! Schema::hasColumn('activity_logs', 'metadata')) {
                $table->jsonb('metadata')->nullable()->after('description');
            }
        });

        $this->backfillCompanyId();

        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE activity_logs MODIFY user_id CHAR(36) NULL');
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE activity_logs ALTER COLUMN user_id SET NOT NULL');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE activity_logs MODIFY user_id CHAR(36) NOT NULL');
        }

        Schema::table('activity_logs', function (Blueprint $table): void {
            if (Schema::hasColumn('activity_logs', 'metadata')) {
                $table->dropColumn('metadata');
            }

            if (Schema::hasColumn('activity_logs', 'task_id')) {
                $table->dropColumn('task_id');
            }

            if (Schema::hasColumn('activity_logs', 'project_id')) {
                $table->dropColumn('project_id');
            }

            if (Schema::hasColumn('activity_logs', 'company_id')) {
                $table->dropColumn('company_id');
            }
        });
    }

    private function backfillCompanyId(): void
    {
        $rows = DB::table('activity_logs')
            ->whereNull('company_id')
            ->get(['id', 'user_id', 'task_id', 'project_id']);

        foreach ($rows as $row) {
            $companyId = null;

            if ($row->user_id) {
                $companyId = DB::table('users')->where('id', $row->user_id)->value('company_id');
            }

            if (! $companyId && $row->task_id) {
                $companyId = DB::table('tasks')
                    ->join('projects', 'tasks.project_id', '=', 'projects.id')
                    ->where('tasks.id', $row->task_id)
                    ->value('projects.company_id');
            }

            if (! $companyId && $row->project_id) {
                $companyId = DB::table('projects')->where('id', $row->project_id)->value('company_id');
            }

            if ($companyId) {
                DB::table('activity_logs')
                    ->where('id', $row->id)
                    ->update(['company_id' => $companyId]);
            }
        }
    }
};
