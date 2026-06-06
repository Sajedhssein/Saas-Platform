<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            if (! Schema::hasColumn('notifications', 'company_id')) {
                $table->uuid('company_id')->nullable()->index()->after('id');
            }

            if (! Schema::hasColumn('notifications', 'entity_type')) {
                $table->string('entity_type')->nullable()->after('type');
            }

            if (! Schema::hasColumn('notifications', 'entity_id')) {
                $table->uuid('entity_id')->nullable()->index()->after('entity_type');
            }

            if (! Schema::hasColumn('notifications', 'metadata')) {
                $table->jsonb('metadata')->nullable()->after('data');
            }
        });

        $this->backfillCompanyId();
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            if (Schema::hasColumn('notifications', 'metadata')) {
                $table->dropColumn('metadata');
            }

            if (Schema::hasColumn('notifications', 'entity_id')) {
                $table->dropColumn('entity_id');
            }

            if (Schema::hasColumn('notifications', 'entity_type')) {
                $table->dropColumn('entity_type');
            }

            if (Schema::hasColumn('notifications', 'company_id')) {
                $table->dropColumn('company_id');
            }
        });
    }

    private function backfillCompanyId(): void
    {
        $rows = DB::table('notifications')
            ->whereNull('company_id')
            ->get(['id', 'user_id']);

        foreach ($rows as $row) {
            $companyId = DB::table('users')->where('id', $row->user_id)->value('company_id');

            if ($companyId) {
                DB::table('notifications')
                    ->where('id', $row->id)
                    ->update(['company_id' => $companyId]);
            }
        }
    }
};
