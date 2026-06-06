<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        $roles = $this->relationLoaded('roles')
            ? $this->roles->pluck('name')
            : $this->roles()->pluck('name');

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'department' => $this->department,
            'position' => $this->position,
            'is_active' => $this->is_active,
            'status' => $this->status,
            'role' => $roles->first(),
            'roles' => $roles,
            'company_name' => $this->company?->name,
            'projects_count' => isset($this->projects_count) ? (int) $this->projects_count : null,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
