<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_date.required' => 'The start_date is required.',
            'start_date.date' => 'The start_date must be a valid date.',
            'end_date.required' => 'The end_date is required.',
            'end_date.date' => 'The end_date must be a valid date.',
            'end_date.after_or_equal' => 'The end_date must be a date after or equal to start_date.',
        ];
    }
}
