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
        Schema::create('reports', function (Blueprint $table) {
             $table->uuid('id')->primary();
            $table->uuid('company_id');
            $table->date('week_start')->nullable();
            $table->date('week_end')->nullable();
            $table->integer('total_tasks')->default(0);
            $table->integer('completed_tasks')->default(0);
            $table->integer('delayed_tasks')->default(0);
            $table->text('progress_overview')->nullable();
            $table->timestamps();

            // foreign key
            $table->foreign('company_id')
                  ->references('id')
                  ->on('companies')
                  ->cascadeOnDelete();

            // indexes
            $table->index('company_id');
            $table->index('week_start');
            $table->index('week_end');

            // Prevent duplicate week report
            $table->unique([
                'company_id',
                'week_start',
                'week_end'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
