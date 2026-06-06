<?php

namespace App\Traits;

use Carbon\Carbon;
use Illuminate\Http\Request;

trait DateFilter
{
    /**
     * Parse a range or custom start/end from the request.
     * Returns [Carbon|null, Carbon|null]
     */
    public static function parseRangeFromRequest(Request $request): array
    {
        // Custom dates take precedence
        if ($request->filled('start_date') || $request->filled('end_date')) {
            $start = $request->filled('start_date') ? Carbon::parse($request->input('start_date')) : null;
            $end = $request->filled('end_date') ? Carbon::parse($request->input('end_date')) : null;
            return [$start, $end];
        }

        $range = $request->input('range');

        if (! $range) {
            return [null, null];
        }

        $now = Carbon::now();
        switch (strtolower($range)) {
            case 'today':
                return [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
            case 'week':
                // last 7 days including today
                return [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()];
            case 'month':
                return [$now->copy()->startOfMonth()->startOfDay(), $now->copy()->endOfDay()];
            default:
                return [null, null];
        }
    }

    /**
     * Scope a query between start and end on given column.
     */
    public function scopeDateRange($query, ?Carbon $start, ?Carbon $end, string $column = 'created_at')
    {
        if (! $start && ! $end) {
            return $query;
        }

        if ($start && $end) {
            return $query->whereBetween($column, [$start->startOfDay(), $end->endOfDay()]);
        }

        if ($start) {
            return $query->where($column, '>=', $start->startOfDay());
        }

        return $query->where($column, '<=', $end->endOfDay());
    }

    /**
     * Apply range parsed from request to the query using given column.
     */
    public function scopeApplyRequestRange($query, Request $request, string $column = 'created_at')
    {
        [$start, $end] = static::parseRangeFromRequest($request);

        if (! $start && ! $end) {
            return $query;
        }

        return $query->dateRange($start, $end, $column);
    }
}
