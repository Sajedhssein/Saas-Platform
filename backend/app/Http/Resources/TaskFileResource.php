<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TaskFileResource extends JsonResource
{
    public function toArray($request): array
    {
        $filePath = $this->file_path;
        $downloadUrl = url("/api/tasks/{$this->task_id}/files/{$this->id}");

        if ($filePath && ! Str::startsWith($filePath, ['http://', 'https://'])) {
            $filePath = Storage::disk(config('filesystems.default'))->url($filePath);
        }

        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'uploaded_by' => $this->uploaded_by,
            'comment_id' => $this->comment_id,
            'name' => $this->file_name,
            'filename' => $this->file_name,
            'original_name' => $this->file_name,
            'file_name' => $this->file_name,
            'file_path' => $filePath,
            'download_url' => $downloadUrl,
            'mime_type' => $this->file_type,
            'size' => $this->file_size,
            'file_type' => $this->file_type,
            'file_size' => $this->file_size,
            'created_at' => $this->created_at?->toDateTimeString(),
            'uploaded_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
