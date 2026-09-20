<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesignRevision extends Model
{
    protected $primaryKey = 'revision_id';
    protected $table = 'design_revisions';

    protected $fillable = [
        'project_id',
        'revision_message',
        'revision_status',
        'requested_at',
        'addressed_at',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'addressed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the project associated with this revision request
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id', 'project_id');
    }
}
