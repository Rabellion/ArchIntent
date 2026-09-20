<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchitectProject extends Model
{
    use HasFactory;

    protected $primaryKey = 'architect_project_id';

    protected $fillable = [
        'architect_portfolio_id',
        'project_ref',
        'project_title',
        'project_description',
        'project_type',
        'style_tags',
        'location',
        'area_sqft',
        'year_completed',
        'budget_range_min',
        'budget_range_max',
        'is_featured',
        'visibility',
    ];

    protected $casts = [
        'style_tags' => 'array',
        'is_featured' => 'boolean',
        'budget_range_min' => 'decimal:2',
        'budget_range_max' => 'decimal:2',
    ];

    protected $appends = ['cover_image', 'formatted_budget'];

    protected static function booted(): void
    {
        static::creating(function (self $project) {
            if ($project->project_ref) {
                return;
            }

            $counter = static::count() + 1;
            do {
                $ref = 'ARC-' . str_pad((string) $counter, 4, '0', STR_PAD_LEFT);
                $exists = static::where('project_ref', $ref)->exists();
                if (!$exists) {
                    $project->project_ref = $ref;
                    break;
                }
                $counter++;
            } while (true);
        });
    }

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(ArchitectPortfolio::class, 'architect_portfolio_id', 'architect_portfolio_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ArchitectProjectImage::class, 'architect_project_id', 'architect_project_id')->orderBy('display_order');
    }

    public function getCoverImageAttribute()
    {
        return $this->images->firstWhere('is_cover', true) ?: $this->images->first();
    }

    public function getFormattedBudgetAttribute(): string
    {
        if ($this->budget_range_min === null && $this->budget_range_max === null) {
            return 'Budget on Request';
        }

        $min = $this->budget_range_min !== null ? number_format((float) $this->budget_range_min, 0) : null;
        $max = $this->budget_range_max !== null ? number_format((float) $this->budget_range_max, 0) : null;

        if ($min && $max) {
            return 'PKR ' . $min . ' - PKR ' . $max;
        }

        if ($min) {
            return 'From PKR ' . $min;
        }

        return 'Up to PKR ' . $max;
    }
}
