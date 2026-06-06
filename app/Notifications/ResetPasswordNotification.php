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
        $resetUrl = sprintf('%s/reset-password/%s', $frontendUrl, urlencode($this->token));

        return (new MailMessage)
            ->subject('Reset Your Password')
            ->greeting('Hello,')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->line('Click the button below to reset your password.')
            ->action('Reset Password', $resetUrl)
            ->line('If you did not request a password reset, no further action is required.')
            ->line('This password reset link will expire in '.config('auth.passwords.'.config('auth.defaults.passwords').'.expire').' minutes.');
    }
}
