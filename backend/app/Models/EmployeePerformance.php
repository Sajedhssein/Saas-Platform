<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class EmployeePerformance extends Model
{
    use HasUuids;

    protected $table = 'employee_performance';

    protected $fillable = [
        'user_id',
        'period_start',
        'period_end',
        'completed_tasks',
        'pending_tasks',
        'total_work_hours',
        'completion_rate',
        'performance_score',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
    ];

    public function user(){
        return $this->belongsTo(User::class);
    }

}
