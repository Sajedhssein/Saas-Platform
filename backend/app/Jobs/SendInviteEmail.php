<?php

namespace App\Jobs;

use App\Mail\InviteMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendInviteEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $invite;
    public function __construct($invite)
    {
        $this->invite = $invite;
    }

    public function handle()
    {
        $this->invite->loadMissing(['company', 'creator']);
        $inviteLink = rtrim((string) env('FRONTEND_URL'), '/') . '/invite/' . urlencode($this->invite->public_id);

        Log::info('SendInviteEmail: starting', ['email' => $this->invite->email, 'mailer' => config('mail.default')]);

        try {
            Mail::to($this->invite->email)->send(new InviteMail($this->invite, $inviteLink));
            Log::info('SendInviteEmail: sent', ['email' => $this->invite->email, 'mailer' => config('mail.default')]);
        } catch (\Throwable $e) {
            Log::error('SendInviteEmail: failed', ['email' => $this->invite->email, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            throw $e;
        }
    }
}
