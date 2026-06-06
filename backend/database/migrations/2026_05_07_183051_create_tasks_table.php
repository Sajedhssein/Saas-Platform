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
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('created_by');
            $table->string('title');
            $table->text('description')->nullable();

            // pending, in_progress, completed...
            $table->string('status')->default('pending');

            // low, medium, high
            $table->string('priority')->default('medium');

            $table->integer('progress')->default(0);
            $table->timestamp('deadline')->nullable();
            $table->integer('estimated_hours')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // foreign keys
            $table->foreign('project_id')
                  ->references('id')
                  ->on('projects')
                  ->cascadeOnDelete();

            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->cascadeOnDelete();

            // indexes
            $table->index('project_id');
            $table->index('created_by');
            $table->index('status');
            $table->index('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
