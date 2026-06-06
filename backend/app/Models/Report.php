<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Report extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'company_id',
        'created_by',
        'report_type',
        'entity_id',
        'format',
        'title',
        'file_path',
        'recipient_email',
        'status',
        'generated_at',
        'sent_at',
        'week_start',
        'week_end',
        'total_tasks',
        'completed_tasks',
        'delayed_tasks',
        'progress_overview',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'sent_at' => 'datetime',
        'week_start' => 'date',
        'week_end' => 'date',
    ];

    public function company(){
        return $this->belongsTo(Company::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForCompany($query, string $companyId)
    {
        return $query->where('company_id', $companyId);
    }

}
