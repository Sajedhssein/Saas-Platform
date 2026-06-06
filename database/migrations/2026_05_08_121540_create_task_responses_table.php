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
        Schema::create('task_responses', function (Blueprint $table) {
             $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('user_id');
            $table->text('response');

            // submitted, approved, rejected...
            $table->string('status')->default('submitted');

            // optional attachment
            $table->text('attachment_url')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // foreign keys
            $table->foreign('task_id')
                  ->references('id')
                  ->on('tasks')
                  ->cascadeOnDelete();

            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->cascadeOnDelete();

            // indexes
            $table->index('task_id');
            $table->index('user_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_responses');
    }
};
