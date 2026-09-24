<?php

namespace Tests\Unit;

use App\Models\Payment;
use App\Models\Project;
use App\Models\User;
use App\Notifications\PaymentReceived;
use Tests\TestCase;

class PaymentReceivedNotificationTest extends TestCase
{
    private function makePayment(?string $payerName = 'Ahmed Khan'): Payment
    {
        $payment = new Payment([
            'project_id' => 13,
            'payer_id' => 2,
            'payee_id' => 21,
            'amount' => 500000,
            'payee_amount' => 450000,
        ]);
        $payment->payment_id = 77;

        $payment->setRelation('payer', $payerName === null ? null : new User(['full_name' => $payerName]));
        $payment->setRelation('project', new Project(['project_title' => 'Modern Penthouse']));

        return $payment;
    }

    public function test_it_is_stored_in_the_database_channel(): void
    {
        $notification = new PaymentReceived($this->makePayment());

        $this->assertSame(['database'], $notification->via(new User()));
    }

    public function test_it_names_the_payer_amount_and_project(): void
    {
        $data = (new PaymentReceived($this->makePayment()))->toArray(new User());

        $this->assertSame('payment_received', $data['kind']);
        $this->assertSame('Ahmed Khan', $data['payer_name']);
        $this->assertSame(2, $data['payer_id']);
        $this->assertSame(500000.0, $data['amount']);
        $this->assertSame(450000.0, $data['payee_amount']);
        $this->assertSame(77, $data['payment_id']);
        $this->assertSame('/project/13', $data['action_url']);
        $this->assertStringContainsString('Ahmed Khan sent PKR 500,000', $data['message']);
        $this->assertStringContainsString('Modern Penthouse', $data['message']);
    }

    public function test_it_falls_back_when_the_payer_is_missing(): void
    {
        $data = (new PaymentReceived($this->makePayment(null)))->toArray(new User());

        $this->assertSame('A client', $data['payer_name']);
        $this->assertStringStartsWith('A client sent PKR', $data['message']);
    }
}
