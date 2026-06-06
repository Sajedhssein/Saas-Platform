<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Role extends Model
{
    use HasFactory, HasUuids;

    const ADMIN = 'admin';
    const EMPLOYEE = 'employee';
    const CLIENT = 'client';
    const SUPER_ADMIN = 'super_admin';

    protected $fillable = [
        'name',
        'description',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    public static function findByName(string $name): ?self
    {
        return static::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
    }

    public static function firstOrCreateByName(string $name): self
    {
        return static::findByName($name) ?? static::create(['name' => strtolower(trim($name))]);
    }

    public static function getByName(string $name): ?self
    {
        return static::findByName($name);
    }
}
