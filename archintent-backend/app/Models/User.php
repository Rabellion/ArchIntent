<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'user_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'full_name',
        'email',
        'password_hash',
        'role',
        'phone_number',
        'profile_image',
        'account_status',
        'identity_type',
        'identity_number',
        'profile_completed',
        'phone_verified_at',
        'email_otp',
        'email_otp_expires_at',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password_hash',
        'remember_token',
        'email_otp',
        'email_otp_expires_at',
        'firebase_uid',
        'firebase_password',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'email_otp_expires_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'firebase_password' => 'encrypted',
        ];
    }

    /**
     * Get the architect record associated with the user.
     */
    public function architect(): HasOne
    {
        return $this->hasOne(Architect::class, 'user_id', 'user_id');
    }

    /**
     * Get the contractor record associated with the user.
     */
    public function contractor(): HasOne
    {
        return $this->hasOne(Contractor::class, 'user_id', 'user_id');
    }

    /**
     * Get messages sent by this user.
     */
    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id', 'user_id');
    }

    /**
     * Get reviews submitted by this user.
     */
    public function reviewer(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id', 'user_id');
    }

    /**
     * Get reviews received by this user.
     */
    public function receivedReviews(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewee_id', 'user_id');
    }

    /**
     * Get average review rating for this user as reviewee.
     */
    public function getAverageRatingAttribute(): float
    {
        return round((float) (Review::where('reviewee_id', $this->user_id)->avg('rating') ?? 0), 2);
    }

    /**
     * Get total reviews count for this user as reviewee.
     */
    public function getTotalReviewsAttribute(): int
    {
        return (int) Review::where('reviewee_id', $this->user_id)->count();
    }

    /**
     * Get the name of the password column for authentication.
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }
}
