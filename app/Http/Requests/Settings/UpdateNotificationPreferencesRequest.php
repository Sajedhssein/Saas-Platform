<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'task_assigned' => ['required', 'boolean'],
            'task_completed' => ['required', 'boolean'],
            'project_updated' => ['required', 'boolean'],
            'report_generated' => ['required', 'boolean'],
            'employee_joined' => ['required', 'boolean'],
            'invite_accepted' => ['required', 'boolean'],
        ];
    }
}
