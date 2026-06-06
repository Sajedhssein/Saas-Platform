<?php

namespace App\Observers;

use App\Models\Report;
use App\Models\User;
use App\Services\NotificationService;

class ReportObserver
{
    public function updated(Report $report): void
    {
        $original = $report->getOriginal();

        if (array_key_exists('status', $original) && $original['status'] !== $report->status) {
            // If report becomes available/published/sent, notify recipient if present
            $status = strtolower($report->status ?? '');

            if (in_array($status, ['available', 'published', 'sent'])) {
                $recipient = null;

                if ($report->recipient_email) {
                    $recipient = User::query()
                        ->where('company_id', $report->company_id)
                        ->where('email', $report->recipient_email)
                        ->first();
                }

                if ($recipient) {
                    NotificationService::create(
                        $recipient,
                        'Report available',
                        "A new report '{$report->title}' is available.",
                        'report_available',
                        [
                            'entity_type' => 'report',
                            'entity_id' => $report->id,
                            'link' => "/client/reports/{$report->id}",
                        ]
                    );
                }
            }
        }
    }
}
