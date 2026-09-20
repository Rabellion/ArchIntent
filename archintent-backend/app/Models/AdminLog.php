<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminLog extends Model
{
    protected $primaryKey = 'log_id';
    protected $fillable = [
        'admin_id',
        'action',
        'target_table',
        'target_id',
        'description',
        'log_time',
    ];

    protected $table = 'admin_logs';
    public $timestamps = false;

    /**
     * Get the admin user who performed the action
     */
    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id', 'user_id');
    }

    /**
     * Boot the model to auto-set log_time on creation
     */
    public static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (!$model->log_time) {
                $model->log_time = now();
            }
        });
    }
}
