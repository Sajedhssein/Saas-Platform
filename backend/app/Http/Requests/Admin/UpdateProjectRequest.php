<?php

namespace App\Http\Requests\Admin;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'client_id' => $this->clientIdRules(),
            'employee_ids' => ['sometimes', 'array'],
            'employee_ids.*' => $this->employeeRules(),
            'description' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'progress' => 'nullable|integer|between:0,100',
            'budget' => 'nullable|numeric|min:0',
        ];
    }

    private function clientIdRules(): array
    {
        $companyId = $this->user()?->company_id;

        if (! $companyId) {
            return ['nullable', 'uuid'];
        }

        return [
            'nullable',
            'uuid',
            Rule::exists('users', 'id')->where(function ($query) use ($companyId) {
                $query->where('company_id', $companyId)
                    ->whereExists(function ($subQuery) {
                        $subQuery->select(DB::raw(1))
                            ->from('user_roles')
                            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
                            ->whereColumn('user_roles.user_id', 'users.id')
                            ->where('roles.name', Role::CLIENT);
                    });
            }),
        ];
    }

    private function employeeRules(): array
    {
        $companyId = $this->user()?->company_id;

        if (! $companyId) {
            return ['uuid'];
        }

        return [
            'uuid',
            Rule::exists('users', 'id')->where(function ($query) use ($companyId) {
                $query->where('company_id', $companyId)
                    ->whereExists(function ($subQuery) {
                        $subQuery->select(DB::raw(1))
                            ->from('user_roles')
                            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
                            ->whereColumn('user_roles.user_id', 'users.id')
                            ->where('roles.name', Role::EMPLOYEE);
                    });
            }),
        ];
    }
}
