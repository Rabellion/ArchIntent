<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Contractor extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'contractor_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'company_name',
        'cnic',
        'city',
        'work_types',
        'registration_number',
        'company_address',
        'verification_status',
        'verification_document',
        'stripe_connect_account_id',
        'stripe_connect_onboarding_complete',
        'experience_years',
        'specialization',
        'bio',
        'rejection_reason',
        'pec_registration',
        'secp_number',
        'ntn_number',
        'pec_document',
        'secp_document',
        'ntn_document',
    ];

    /**
     * Attribute casts.
     */
    protected $casts = [
        'work_types' => 'array',
        'stripe_connect_onboarding_complete' => 'boolean',
    ];


    /**
     * Get the user that owns the contractor record.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Get all bids submitted by this contractor.
     */
    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class, 'contractor_id', 'contractor_id');
    }

    /**
     * Get all accepted bids for this contractor.
     */
    public function acceptedBids(): HasMany
    {
        return $this->hasMany(Bid::class, 'contractor_id', 'contractor_id')
            ->where('bid_status', 'accepted');
    }

    /**
     * Get portfolio projects for this contractor.
     */
    public function portfolio(): HasOne
    {
        return $this->hasOne(ContractorPortfolio::class, 'contractor_id', 'contractor_id');
    }

    public function portfolioProjects(): HasManyThrough
    {
        return $this->hasManyThrough(
            ContractorProject::class,
            ContractorPortfolio::class,
            'contractor_id',
            'contractor_portfolio_id',
            'contractor_id',
            'contractor_portfolio_id'
        );
    }

    /**
     * Get contractor Budz wallet.
     */
    public function budzWallet()
    {
        return $this->hasOne(BudzWallet::class, 'contractor_id', 'contractor_id');
    }

    /**
     * Get contractor Budz transactions.
     */
    public function budzTransactions(): HasMany
    {
        return $this->hasMany(BudzTransaction::class, 'contractor_id', 'contractor_id');
    }
}
