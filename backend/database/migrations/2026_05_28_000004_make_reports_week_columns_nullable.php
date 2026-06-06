<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('reports')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE reports ALTER COLUMN week_start DROP NOT NULL');
            DB::statement('ALTER TABLE reports ALTER COLUMN week_end DROP NOT NULL');
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE reports MODIFY week_start DATE NULL');
            DB::statement('ALTER TABLE reports MODIFY week_end DATE NULL');
            return;
        }

        if ($driver === 'sqlite') {
            return;
        }

        Schema::table('reports', function ($table) {
            $table->date('week_start')->nullable()->change();
            $table->date('week_end')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('reports')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE reports ALTER COLUMN week_start SET NOT NULL');
            DB::statement('ALTER TABLE reports ALTER COLUMN week_end SET NOT NULL');
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE reports MODIFY week_start DATE NOT NULL');
            DB::statement('ALTER TABLE reports MODIFY week_end DATE NOT NULL');
            return;
        }

        if ($driver === 'sqlite') {
            return;
        }

        Schema::table('reports', function ($table) {
            $table->date('week_start')->nullable(false)->change();
            $table->date('week_end')->nullable(false)->change();
        });
    }
};
