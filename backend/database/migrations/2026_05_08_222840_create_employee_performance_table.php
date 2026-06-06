<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('employee_performance', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->date('period_start');
            $table->date('period_end');
            $table->integer('completed_tasks')->default(0);
            $table->integer('pending_tasks')->default(0);
            $table->integer('total_work_hours')->default(0);
            $table->decimal('completion_rate', 5, 2)->default(0);
            $table->decimal('performance_score', 5, 2)->default(0);
            $table->timestamps();

            // foreign key
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->cascadeOnDelete();

            // indexes
            $table->index('user_id');
            $table->index('period_start');
            $table->index('period_end');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_performance');
    }
};
