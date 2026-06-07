<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskStatusRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->input('status') === 'todo') {
            $this->merge(['status' => 'pending']);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|string|in:pending,in_progress,completed',
        ];
    }
}
