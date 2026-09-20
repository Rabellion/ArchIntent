<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchitectPortfolio extends Model
{
    use HasFactory;

    protected $primaryKey = 'architect_portfolio_id';

    protected $fillable = [
        'architect_id',
        'bio_statement',
        'total_projects_count',
    ];

    public function architect(): BelongsTo
    {
        return $this->belongsTo(Architect::class, 'architect_id', 'architect_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(ArchitectProject::class, 'architect_portfolio_id', 'architect_portfolio_id');
    }
}
