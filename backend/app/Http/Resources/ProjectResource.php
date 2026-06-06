<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    private function calculateProgress(float|int|null $averageTaskProgress, int $totalTasks): int
    {
        if ($totalTasks === 0) {
            return 0;
        }

        return (int) round((float) $averageTaskProgress);
    }

    public function toArray($request): array
    {
        $totalTasks = (int) ($this->tasks_count ?? 0);
        $completedTasks = (int) ($this->completed_tasks ?? 0);
        $averageTaskProgress = $this->tasks_avg_progress;

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'client' => $this->relationLoaded('client') && $this->client ? [
                'id' => $this->client->id,
                'name' => $this->client->name,
            ] : null,
            'employees' => $this->relationLoaded('employees') ? $this->employees->map(fn ($employee) => [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
            ])->values() : [],
            'created_by' => $this->created_by,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'progress' => $this->calculateProgress($averageTaskProgress, $totalTasks),
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'budget' => $this->budget,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
