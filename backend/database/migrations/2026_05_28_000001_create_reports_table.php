<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->foreignUuid('created_by')->nullable()->after('company_id')->constrained('users')->cascadeOnDelete();
            $table->string('report_type')->nullable()->after('created_by');
            $table->uuid('entity_id')->nullable()->after('report_type')->index();
            $table->string('format')->nullable()->after('entity_id');
            $table->string('title')->nullable()->after('format');
            $table->string('file_path')->nullable()->after('title');
            $table->string('recipient_email')->nullable()->after('file_path');
            $table->string('status')->default('generated')->after('recipient_email');
            $table->timestamp('generated_at')->nullable()->after('status');
            $table->timestamp('sent_at')->nullable()->after('generated_at');
            $table->softDeletes()->after('sent_at');

            $table->index(['company_id', 'report_type']);
            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'generated_at']);
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'created_by',
                'report_type',
                'entity_id',
                'format',
                'title',
                'file_path',
                'recipient_email',
                'status',
                'generated_at',
                'sent_at',
            ]);
        });
    }
};
