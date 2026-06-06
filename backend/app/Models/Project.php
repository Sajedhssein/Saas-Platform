<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\ProjectUser;
use App\Models\Client;

class Project extends Model
{
    use HasFactory, HasUuids, SoftDeletes;
    use \App\Traits\DateFilter;

    protected $fillable = [
        'company_id',
        'client_id',
        'created_by',
        'name',
        'description',
        'status',
        'start_date',
        'end_date',
        'progress',
        'budget',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'progress' => 'integer',
        'budget' => 'decimal:2',
    ];

    public function company(){
        return $this->belongsTo(Company::class);
    }

    public function client(){
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function creator(){
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeInSameCompany($query, $user)
    {
        return $query->where('company_id', $user->company_id);
    }

    public function tasks(){
        return $this->hasMany(Task::class);
    }

    public function users(){
        return $this->belongsToMany(User::class, 'project_users')
            ->using(ProjectUser::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function employees()
    {
        return $this->belongsToMany(User::class, 'project_users')
            ->using(ProjectUser::class)
            ->withPivot('role')
            ->withTimestamps();
    }
}
