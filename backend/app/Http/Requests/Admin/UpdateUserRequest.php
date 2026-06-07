<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id ?? $this->route('employee')?->id;

        return [
            'name' => 'sometimes|required|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'phone' => 'nullable|string|max:50',
            'avatar' => 'nullable|url|max:2048',
            'avatar_url' => 'nullable|url|max:2048',
            'department' => 'nullable|string|max:255',
            'position' => 'nullable|string|max:255',
            'status' => [
                'nullable',
                'string',
                Rule::in(['active', 'inactive']),
            ],
        ];
    }
}
