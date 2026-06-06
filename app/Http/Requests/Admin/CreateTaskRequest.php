<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_id' => 'required|uuid|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:pending,in_progress,completed',
            'priority' => 'nullable|string|in:low,medium,high',
            'progress' => 'nullable|integer|between:0,100',
            'deadline' => 'nullable|date',
            'estimated_hours' => 'nullable|integer|min:0',
        ];
    }
}
