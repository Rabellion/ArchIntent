<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Architect extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'architect_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'license_number',
        'cnic',
        'city',
        'design_types',
        'experience_years',
        'specialization',
        'bio',
        'verification_status',
        'verification_document',
        'stripe_connect_account_id',
        'stripe_connect_onboarding_complete',
        'rejection_reason',
        'pcatp_number',
        'pcatp_document',
        'ntn_number',
        'ntn_document',
        // Demo bank-transfer payout path (see ArchitectPayoutController).
        'bank_name',
        'bank_account_title',
        'bank_account_number',
        'bank_iban',
        'bank_details_updated_at',
    ];

    /**
     * Never serialise the raw account number. Responses expose only the
     * last four digits, built explicitly in ArchitectPayoutController.
     */
    protected $hidden = [
        'bank_account_number',
    ];

    /**
     * Attribute casts.
     */
    protected $casts = [
        'design_types' => 'array',
        'stripe_connect_onboarding_complete' => 'boolean',
    ];


    /**
     * Get the user that owns the architect record.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Get the architect's portfolio.
     */
    public function portfolio(): HasOne
    {
        return $this->hasOne(ArchitectPortfolio::class, 'architect_id', 'architect_id');
    }

    public function getPortfolioProjectsAttribute()
    {
        $portfolio = $this->portfolio;
        if (!$portfolio) {
            return collect();
        }

        return $portfolio->projects()->where('visibility', 'public')->with('images')->get();
    }
}
