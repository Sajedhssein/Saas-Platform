<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invites', function (Blueprint $table): void {
            if (! Schema::hasColumn('invites', 'last_resent_at')) {
                $table->timestamp('last_resent_at')->nullable()->after('is_hidden');
            }

            if (! Schema::hasColumn('invites', 'resent_count')) {
                $table->unsignedInteger('resent_count')->default(0)->after('last_resent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invites', function (Blueprint $table): void {
            if (Schema::hasColumn('invites', 'resent_count')) {
                $table->dropColumn('resent_count');
            }

            if (Schema::hasColumn('invites', 'last_resent_at')) {
                $table->dropColumn('last_resent_at');
            }
        });
    }
};
