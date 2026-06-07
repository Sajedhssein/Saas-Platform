<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(public string $token)
    {
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'https://frontend-domain'), '/');
        $resetUrl = sprintf(
            '%s/reset-password?token=%s&email=%s',
            $frontendUrl,
            urlencode($this->token),
            urlencode($notifiable->email)
        );
        $expireMinutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Reset Your Password')
            ->action('Reset Password', $resetUrl)
            ->view('emails.reset-password', [
                'email' => $notifiable->email,
                'resetUrl' => $resetUrl,
                'expireMinutes' => $expireMinutes,
            ]);
    }
}
