<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $clientId = $this->route('client')?->id;

        return [
            'name' => 'sometimes|required_without:contactName|string|max:255',
            'contactName' => 'sometimes|required_without:name|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($clientId),
            ],
            'is_active' => 'sometimes|boolean',
            'status' => [
                'sometimes',
                'string',
                Rule::in(['active', 'inactive']),
            ],
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'projects' => 'nullable|integer|min:0',
            'avatar' => 'nullable|url|max:2048',
            'avatar_url' => 'nullable|url|max:2048',
        ];
    }
}
