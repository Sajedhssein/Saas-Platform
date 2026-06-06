<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportRangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'range' => ['nullable', 'in:today,week,month'],
        ];
    }

    public function messages(): array
    {
        return [
            'range.in' => 'The selected range is invalid. Allowed: today, week, month.',
        ];
    }
}
