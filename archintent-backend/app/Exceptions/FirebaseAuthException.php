<?php

namespace App\Exceptions;

class FirebaseAuthException extends \RuntimeException
{
    /**
     * @param string $firebaseCode Firebase's error identifier, e.g. EMAIL_EXISTS.
     */
    public function __construct(public readonly string $firebaseCode)
    {
        parent::__construct("Firebase Auth error: {$firebaseCode}");
    }
}
