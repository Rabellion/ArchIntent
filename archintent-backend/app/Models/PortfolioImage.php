<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioImage extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'image_id';

    /**
     * Indicates if the model has timestamps.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'portfolio_id',
        'image_path',
        'uploaded_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    /**
     * Get the attributes that should be appended to arrays.
     *
     * @var array
     */
    protected $appends = ['image_url', 'portfolio_image_id'];

    /**
     * Get the image URL.
     */
    public function getImageUrlAttribute()
    {
        if ($this->image_path) {
            $baseUrl = rtrim(config('app.url') ?: 'http://127.0.0.1:8000', '/');
            return "{$baseUrl}/api/storage/portfolios/{$this->portfolio_id}/" . rawurlencode(trim($this->image_path));
        }
        return null;
    }

    /**
     * Get the portfolio_image_id (alias for image_id).
     */
    public function getPortfolioImageIdAttribute()
    {
        return $this->image_id;
    }

    /**
     * Get the portfolio that owns this image.
     */
    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class, 'portfolio_id', 'portfolio_id');
    }
}
