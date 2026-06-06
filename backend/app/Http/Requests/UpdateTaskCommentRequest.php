<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->id() === $this->comment->user_id;
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'min:1', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'content.required' => 'Comment content is required',
            'content.string' => 'Comment must be a string',
            'content.min' => 'Comment must have at least 1 character',
            'content.max' => 'Comment cannot exceed 5000 characters',
        ];
    }
}
