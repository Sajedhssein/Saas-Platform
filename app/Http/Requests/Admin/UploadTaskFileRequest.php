<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadTaskFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|max:20480|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,csv,zip,txt',
        ];
    }
}
