<?php

namespace App\Models;

use App\Support\ImageUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArchitectProjectImage extends Model
{
    use HasFactory;

    protected $primaryKey = 'image_id';

    public $timestamps = false;

    protected $fillable = [
        'architect_project_id',
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
        return $this->belongsTo(ArchitectProject::class, 'architect_project_id', 'architect_project_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return ImageUrl::resolve($this->image_path, "architect_projects/{$this->architect_project_id}");
    }
}
