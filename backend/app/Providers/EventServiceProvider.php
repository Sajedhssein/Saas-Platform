<?php

namespace App\Providers;

use App\Events\FileUploaded;
use App\Listeners\CreateFileUploadedNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        FileUploaded::class => [
            CreateFileUploadedNotification::class,
        ],
    ];
}
