<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invites', function (Blueprint $table) {
            $table->string('public_id', 26)->nullable()->after('id');
        });

        $invites = DB::table('invites')
            ->whereNull('public_id')
            ->get(['id']);

        foreach ($invites as $invite) {
            DB::table('invites')
                ->where('id', $invite->id)
                ->update(['public_id' => (string) Str::ulid()]);
        }

        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE invites ALTER COLUMN public_id SET NOT NULL');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE invites MODIFY public_id VARCHAR(26) NOT NULL');
        }

        Schema::table('invites', function (Blueprint $table) {
            $table->unique('public_id');
        });
    }

    public function down(): void
    {
        Schema::table('invites', function (Blueprint $table) {
            $table->dropUnique(['public_id']);
            $table->dropColumn('public_id');
        });
    }
};
