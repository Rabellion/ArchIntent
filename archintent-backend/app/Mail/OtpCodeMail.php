<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OtpCodeMail extends Mailable
{
    public function __construct(
        public readonly string $userName,
        public readonly string $otpCode,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your ArchIntent verification code');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
            text: 'emails.otp-text',
            with: ['userName' => $this->userName, 'otpCode' => $this->otpCode],
        );
    }
}
