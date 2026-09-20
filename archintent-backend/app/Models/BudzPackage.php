<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudzPackage extends Model
{
    protected $primaryKey = 'package_id';

    protected $fillable = [
        'name',
        'budz_amount',
        'price_pkr',
        'stripe_price_id',
        'is_active',
    ];

    protected $casts = [
        'price_pkr' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
