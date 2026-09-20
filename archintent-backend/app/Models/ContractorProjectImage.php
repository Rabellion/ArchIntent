<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractorProjectImage extends Model
{
    use HasFactory;

    protected $primaryKey = 'image_id';

    public $timestamps = false;

    protected $fillable = [
        'contractor_project_id',
        'image_path',
        'caption',
        'is_cover',
        'display_order',
        'uploaded_at',
    ];

    protected $casts = [
        'is_cover' => 'boolean',
        'uploaded_at' => 'datetime',
    ];

    protected $appends = ['image_url'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(ContractorProject::class, 'contractor_project_id', 'contractor_project_id');
    }

    public function getImageUrlAttribute(): string
    {
        $baseUrl = rtrim(config('app.url') ?: 'http://127.0.0.1:8000', '/');
        return "{$baseUrl}/api/storage/contractor_projects/{$this->contractor_project_id}/" . rawurlencode(trim((string) $this->image_path));
    }
}
