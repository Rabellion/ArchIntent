<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudzTransaction extends Model
{
    protected $primaryKey = 'transaction_id';

    public $timestamps = false;

    protected $fillable = [
        'contractor_id',
        'transaction_type',
        'budz_amount',
        'balance_after',
        'description',
        'stripe_payment_id',
        'reference_id',
        'created_at',
    ];

    protected $casts = [
        'budz_amount' => 'integer',
        'balance_after' => 'integer',
        'created_at' => 'datetime',
    ];

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class, 'contractor_id', 'contractor_id');
    }
}
