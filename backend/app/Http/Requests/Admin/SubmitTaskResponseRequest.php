<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SubmitTaskResponseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response' => 'required|string',
            'attachment' => 'nullable|file|max:20480|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,csv,zip,txt',
        ];
    }
}
