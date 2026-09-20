<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractorProject extends Model
{
    use HasFactory;

    protected $primaryKey = 'contractor_project_id';

    protected $fillable = [
        'contractor_portfolio_id',
        'project_ref',
        'project_title',
        'project_description',
        'project_type',
        'location',
        'area_sqft',
        'completion_date',
        'project_value_pkr',
        'duration_days',
        'client_feedback',
        'is_featured',
        'visibility',
    ];

    protected $casts = [
        'completion_date' => 'date',
        'project_value_pkr' => 'decimal:2',
        'is_featured' => 'boolean',
    ];

    protected $appends = ['cover_image'];

    protected static function booted(): void
    {
        static::creating(function (self $project) {
            if ($project->project_ref) {
                return;
            }

            $counter = static::count() + 1;
            do {
                $ref = 'CON-' . str_pad((string) $counter, 4, '0', STR_PAD_LEFT);
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
        return $this->belongsTo(ContractorPortfolio::class, 'contractor_portfolio_id', 'contractor_portfolio_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ContractorProjectImage::class, 'contractor_project_id', 'contractor_project_id')->orderBy('display_order');
    }

    public function getCoverImageAttribute()
    {
        return $this->images->firstWhere('is_cover', true) ?: $this->images->first();
    }
}
