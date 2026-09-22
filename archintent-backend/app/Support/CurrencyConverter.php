<?php

namespace App\Support;

/**
 * Converts a PKR amount into what Stripe actually needs to charge or
 * transfer.
 *
 * The platform's Stripe account is US-region and doesn't accept PKR as
 * a charge/transfer currency, but every price on the frontend, and
 * every amount stored in the database (Payment.amount, platform_fee,
 * payee_amount, BudzPackage.price_pkr), is denominated in PKR because
 * that's the currency the marketplace's clients, architects and
 * contractors actually think in. This class is the one place that
 * bridges the two: everything else in the app keeps working in PKR,
 * and only the literal number handed to a Stripe API call goes through
 * here first.
 *
 * The rate is fixed, not a live FX lookup, on purpose: a client's
 * charge and the architect's later payout for the same project have to
 * convert at the same number, or the two sides of one transaction
 * would silently drift apart from each other over time as a live rate
 * moved between the two events.
 */
class CurrencyConverter
{
    public static function pkrPerUsd(): float
    {
        $rate = (float) config('payment.pkr_per_usd', 280);

        return $rate > 0 ? $rate : 280.0;
    }

    /**
     * A PKR amount converted to USD, rounded to cents.
     */
    public static function pkrToUsd(float $pkrAmount): float
    {
        return round($pkrAmount / self::pkrPerUsd(), 2);
    }

    /**
     * A PKR amount converted to the minor unit Stripe's API expects
     * (cents, for USD). Stripe rejects a zero-amount PaymentIntent, so
     * this floors at 1 cent rather than letting a very small PKR
     * amount round down to 0.
     */
    public static function pkrToStripeMinorUnits(float $pkrAmount): int
    {
        return (int) max(1, round(self::pkrToUsd($pkrAmount) * 100));
    }
}
