<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agreement extends Model
{
    use HasFactory;

    protected $primaryKey = 'agreement_id';

    protected $fillable = [
        'project_id',
        'agreement_status',
        'scope_of_work',
        'deliverables',
        'timeline_days',
        'payment_terms',
        'revision_policy',
        'cancellation_terms',
        'change_request_message',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['status'];

    /**
     * Get the status accessor (maps agreement_status to status for API)
     */
    public function getStatusAttribute()
    {
        return $this->agreement_status;
    }

    /**
     * Get the project this agreement is for
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id', 'project_id');
    }

    /**
     * Get the architect this agreement is for (via project.selected_architect_id)
     */
    public function architect()
    {
        return $this->project->selectedArchitect();
    }

    /**
     * Get all signatures for this agreement
     */
    public function signatures(): HasMany
    {
        return $this->hasMany(AgreementSignature::class, 'agreement_id', 'agreement_id');
    }
}
