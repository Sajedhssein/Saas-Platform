<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateInviteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email',
            'role' => ['required', 'string', Rule::in(['employee', 'client'])],
            'expires_in_minutes' => 'nullable|integer|min:5',
        ];
    }
}
