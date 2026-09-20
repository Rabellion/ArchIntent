<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Portfolio extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'portfolio_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'architect_id',
        'title',
        'description',
        'style_tags',
        'budget_min',
        'budget_max',
        'semantic_vector_id',
        'visibility',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'style_tags' => 'array',
        'budget_min' => 'decimal:2',
        'budget_max' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the architect that owns this portfolio.
     */
    public function architect(): BelongsTo
    {
        return $this->belongsTo(Architect::class, 'architect_id', 'architect_id');
    }

    /**
     * Get all portfolio images.
     */
    public function images(): HasMany
    {
        return $this->hasMany(PortfolioImage::class, 'portfolio_id', 'portfolio_id');
    }
}
