<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Project extends Model
{
    use HasFactory;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'project_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'client_id',
        'selected_architect_id',
        'selected_contractor_id',
        'project_title',
        'brief_text',
        'extracted_parameters',
        'budget',
        'location',
        'project_type',
        'project_status',
        'semantic_vector_id',
        'design_file_path',
        'design_delivered_at',
        'mda_verification_deadline',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'budget' => 'decimal:2',
        'extracted_parameters' => 'json',
        'design_delivered_at' => 'datetime',
        'mda_verification_deadline' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the client (user) that owns the project.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id', 'user_id');
    }

    /**
     * Get the selected architect for this project.
     */
    public function architect(): BelongsTo
    {
        return $this->belongsTo(Architect::class, 'selected_architect_id', 'architect_id');
    }

    /**
     * Alias for selected architect relationship.
     */
    public function selectedArchitect(): BelongsTo
    {
        return $this->belongsTo(Architect::class, 'selected_architect_id', 'architect_id');
    }

    /**
     * Get the selected contractor for this project.
     */
    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class, 'selected_contractor_id', 'contractor_id');
    }

    /**
     * Alias for selected contractor relationship.
     */
    public function selectedContractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class, 'selected_contractor_id', 'contractor_id');
    }

    /**
     * Get the bids for this project.
     */
    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class, 'project_id', 'project_id');
    }

    /**
     * Get the matched architects for this project.
     */
    public function matches(): HasMany
    {
        return $this->hasMany(ProjectMatch::class, 'project_id', 'project_id');
    }

    /**
     * Get the agreement for this project.
     */
    public function agreement(): HasOne
    {
        return $this->hasOne(Agreement::class, 'project_id', 'project_id');
    }

    /**
     * Get the design revision requests for this project.
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(DesignRevision::class, 'project_id', 'project_id');
    }

    /**
     * Get reviews submitted for this project.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'project_id', 'project_id');
    }
}
