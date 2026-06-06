<?php

namespace App\Models;

class Client extends User
{
    protected $table = 'users';

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id');
    }

    public function projects()
    {
        return $this->hasMany(Project::class, 'client_id');
    }
}
