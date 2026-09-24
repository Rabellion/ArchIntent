<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Notifications\Notification;

class PaymentReceived extends Notification
{
    public function __construct(private readonly Payment $payment)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $payerName = $this->payment->payer?->full_name ?? 'A client';
        $projectTitle = $this->payment->project?->project_title ?? 'your project';
        $amount = number_format((float) $this->payment->amount);

        return [
            'kind' => 'payment_received',
            'title' => 'Payment received',
            'message' => "{$payerName} sent PKR {$amount} for \"{$projectTitle}\". Funds are held in escrow until the design is approved.",
            'payment_id' => $this->payment->payment_id,
            'project_id' => $this->payment->project_id,
            'project_title' => $projectTitle,
            'payer_id' => $this->payment->payer_id,
            'payer_name' => $payerName,
            'amount' => (float) $this->payment->amount,
            'payee_amount' => (float) ($this->payment->payee_amount ?? $this->payment->amount),
            'currency' => 'PKR',
            'action_url' => "/project/{$this->payment->project_id}",
        ];
    }
}
