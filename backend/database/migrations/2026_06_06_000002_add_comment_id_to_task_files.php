<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('task_files', 'comment_id')) {
            return;
        }

        Schema::table('task_files', function (Blueprint $table) {
            $table->uuid('comment_id')->nullable()->after('uploaded_by');
            $table->foreign('comment_id')
                ->references('id')
                ->on('task_comments')
                ->nullOnDelete();
            $table->index(['task_id', 'comment_id']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('task_files', 'comment_id')) {
            return;
        }

        Schema::table('task_files', function (Blueprint $table) {
            $table->dropIndex(['task_id', 'comment_id']);
            $table->dropForeign(['comment_id']);
            $table->dropColumn('comment_id');
        });
    }
};
