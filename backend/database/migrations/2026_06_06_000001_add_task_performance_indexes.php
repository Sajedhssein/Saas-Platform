<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_users', function (Blueprint $table): void {
            $table->index(['user_id', 'task_id'], 'task_users_user_task_index');
        });

        Schema::table('tasks', function (Blueprint $table): void {
            $table->index(['status', 'updated_at'], 'tasks_status_updated_index');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropIndex('tasks_status_updated_index');
        });

        Schema::table('task_users', function (Blueprint $table): void {
            $table->dropIndex('task_users_user_task_index');
        });
    }
};
