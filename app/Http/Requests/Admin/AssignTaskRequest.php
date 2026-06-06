<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = auth()->user()?->company_id;

        return [
            'assignees' => ['present', 'array'],
            'assignees.*.id' => [
                'required',
                'uuid',
                'distinct',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('company_id', $companyId)),
            ],
            'assignees.*.role' => ['nullable', 'string', 'max:50'],
        ];
    }
}
