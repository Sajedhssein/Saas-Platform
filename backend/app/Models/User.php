<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
// use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\ProjectUser;

#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;
    use HasUuids, SoftDeletes;

    protected $attributes = [
        'status' => 'active',
    ];

    protected $fillable = [
        'company_id',
        'name',
        'email',
        'password',
        'avatar_url',
        'department',
        'position',
        'status',
        'is_active',
        'phone',
        'first_login_at',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'token_invalidated_at' => 'datetime',
        'is_active' => 'boolean',
        'first_login_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $user): void {
            if (empty($user->status)) {
                $user->status = 'active';
            }
        });

        static::deleting(function (self $user): void {
            if ($user->hasRole('client')) {
                $user->ownedProjects()->update(['client_id' => null]);
            }
        });
    }

    public function getJWTIdentifier(){
        return $this->getKey();
    }

    public function getJWTCustomClaims(){
        return [];
    }

    public function company(){
        return $this->belongsTo(Company::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function scopeInSameCompany($query, $user)
    {
        return $query->where('company_id', $user->company_id);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    public function hasRole(string $role): bool
    {
        return $this->roles->contains(function ($roleModel) use ($role) {
            return strtolower($roleModel->name) === strtolower($role);
        });
    }

    public function hasAnyRole(array|string $roles): bool
    {
        $roles = is_array($roles) ? $roles : explode(',', $roles);

        return $this->roles->contains(function ($roleModel) use ($roles) {
            return in_array(strtolower($roleModel->name), array_map('strtolower', $roles), true);
        });
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function createdProjects(){
        return $this->hasMany(Project::class, 'created_by');
    }

    public function createdTasks(){
        return $this->hasMany(Task::class, 'created_by');
    }

    public function ownedProjects()
    {
        return $this->hasMany(Project::class, 'client_id');
    }

    public function tasks() {
        return $this->belongsToMany(Task::class, 'task_users')
            ->using(TaskUser::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function activeTasks()
    {
        return $this->tasks()->whereIn('status', ['pending', 'in_progress']);
    }

    public function taskComments() {
        return $this->hasMany(TaskComment::class);
    }

    public function uploadedFiles() {
        return $this->hasMany(TaskFile::class, 'uploaded_by');
    }

    public function taskResponses() {
        return $this->hasMany(TaskResponse::class);
    }

    public function projects(){
        return $this->belongsToMany(Project::class, 'project_users')
            ->using(ProjectUser::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function employeeProjects()
    {
        return $this->projects();
    }

    public function notifications() {
        return $this->hasMany(Notification::class);
    }

    public function notificationPreference()
    {
        return $this->hasOne(NotificationPreference::class, 'user_id', 'id');
    }

    public function activityLogs() {
        return $this->hasMany(ActivityLog::class);
    }

    public function performanceRecords() {
        return $this->hasMany(EmployeePerformance::class);
    }



}
