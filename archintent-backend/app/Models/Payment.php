<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'payment_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'payer_id',
        'payee_id',
        'amount',
        'platform_fee',
        'payee_amount',
        'stripe_payment_id',
        'stripe_transfer_id',
        'payment_type',
        'payment_status',
        'payee_notified_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'payee_amount' => 'decimal:2',
        'payee_notified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project that this payment is for.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id', 'project_id');
    }

    /**
     * Get the user who made the payment (client).
     */
    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payer_id', 'user_id');
    }

    /**
     * Get the user who receives the payment (architect).
     */
    public function payee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payee_id', 'user_id');
    }
}
