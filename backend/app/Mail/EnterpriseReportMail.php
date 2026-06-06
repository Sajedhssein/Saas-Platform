<?php

namespace App\Mail;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class EnterpriseReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Report $report, public string $recipientEmail)
    {
    }

    public function build()
    {
        $isPdf = $this->report->format === 'pdf';
        $routeName = $isPdf ? 'admin.reports.view' : 'admin.reports.download';

        return $this->subject($this->report->title)
            ->view('emails.reports.enterprise')
            ->with([
                'report' => $this->report,
                'actionUrl' => URL::temporarySignedRoute($routeName, now()->addDays(7), ['report' => $this->report->id]),
                'actionLabel' => $isPdf ? 'View Report' : 'Download Report',
            ])
            ->attachFromStorageDisk('reports', $this->report->file_path, basename($this->report->file_path));
    }
}
