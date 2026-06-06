<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class InviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invite;
    public $acceptUrl;

    public function __construct($invite, string $acceptUrl)
    {
        $this->invite = $invite;
        $this->acceptUrl = $acceptUrl;
    }

    public function build()
    {
        $companyName = optional($this->invite->company)->name ?? 'our platform';

        return $this->subject('You have been invited to ' . $companyName)
            ->view('emails.invite')
            ->with([
                'invite' => $this->invite,
                'acceptUrl' => $this->acceptUrl,
            ]);
    }
}
