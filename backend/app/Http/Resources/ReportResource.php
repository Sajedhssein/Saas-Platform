<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

class ReportResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'created_by' => $this->created_by,
            'report_type' => $this->report_type,
            'entity_id' => $this->entity_id,
            'format' => $this->format,
            'title' => $this->title,
            'file_path' => $this->file_path,
            'recipient_email' => $this->recipient_email,
            'status' => $this->status,
            'generated_at' => $this->generated_at?->toDateTimeString(),
            'sent_at' => $this->sent_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'download_url' => Route::has('admin.reports.download') ? URL::temporarySignedRoute('admin.reports.download', now()->addDays(7), ['report' => $this->id]) : null,
            'view_url' => Route::has('admin.reports.view') ? URL::temporarySignedRoute('admin.reports.view', now()->addDays(7), ['report' => $this->id]) : null,
        ];
    }
}
