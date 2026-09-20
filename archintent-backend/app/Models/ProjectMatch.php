<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMatch extends Model
{
    protected $table = 'project_matches';

    protected $primaryKey = 'match_id';

    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'project_id',
        'architect_id',
        'architect_project_id',
        'match_score',
    ];

    protected $casts = [
        'match_score' => 'float',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id', 'project_id');
    }

    public function architect(): BelongsTo
    {
        return $this->belongsTo(Architect::class, 'architect_id', 'architect_id');
    }

    public function architectProject(): BelongsTo
    {
        return $this->belongsTo(ArchitectProject::class, 'architect_project_id', 'architect_project_id');
    }
}
