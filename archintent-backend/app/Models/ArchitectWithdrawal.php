<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A withdrawal request raised by an architect against their available
 * balance.
 *
 * This records intent only -- creating a row does not move money. An
 * operator actions it and flips the status.
 */
class ArchitectWithdrawal extends Model
{
    protected $table = 'architect_withdrawals';

    protected $primaryKey = 'withdrawal_id';

    protected $fillable = [
        'architect_id',
        'amount',
        'status',
        'bank_name',
        'bank_account_title',
        'bank_account_last4',
        'note',
        'requested_at',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    /**
     * Statuses that still hold funds against the architect's balance.
     * A rejected request releases the amount back.
     */
    public const ENCUMBERING_STATUSES = ['requested', 'approved'];

    public function architect(): BelongsTo
    {
        return $this->belongsTo(Architect::class, 'architect_id', 'architect_id');
    }
}
