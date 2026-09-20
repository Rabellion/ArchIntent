<?php

namespace App\Helpers;

/**
 * Single source of truth for the Stripe TLS verification setting.
 *
 * STRIPE_VERIFY_SSL=false exists only as a local workaround for XAMPP
 * installs that ship without a usable CA bundle. Disabling certificate
 * verification against a payment provider in a deployed environment
 * would allow an attacker positioned on the network to intercept or
 * alter payment and payout traffic, so it is refused outright outside
 * local and testing.
 *
 * Previously this check was duplicated in PaymentController and
 * BudzController but missing from PaymentService and
 * ArchitectStripeConnectController, which meant Stripe Connect payouts
 * could run unverified in production. Every Stripe call now routes
 * through this helper.
 */
class StripeSslHelper
{
    /**
     * Resolve the value for Guzzle's "verify" option.
     *
     * @throws \RuntimeException When verification is disabled outside
     *                           local or testing environments.
     */
    public static function verify(): bool
    {
        $verify = (bool) config('services.stripe.verify_ssl', true);

        if ($verify === false && ! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException(
                'STRIPE_VERIFY_SSL=false is only allowed in local/testing environments'
            );
        }

        return $verify;
    }
}
