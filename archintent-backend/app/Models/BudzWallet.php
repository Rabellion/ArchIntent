<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudzWallet extends Model
{
    protected $primaryKey = 'wallet_id';

    protected $fillable = [
        'contractor_id',
        'balance',
        'total_purchased',
    ];

    protected $casts = [
        'balance' => 'integer',
        'total_purchased' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class, 'contractor_id', 'contractor_id');
    }
}
