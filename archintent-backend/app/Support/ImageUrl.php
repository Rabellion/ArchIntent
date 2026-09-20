<?php

namespace App\Support;

/**
 * Resolves a stored image_path into the absolute URL the frontend
 * should load.
 *
 * image_path holds two genuinely different kinds of value depending on
 * how the image got there:
 *   - a bare filename for a file actually uploaded to local disk
 *     storage (e.g. "photo1.jpg"), which needs building into
 *     /api/storage/{prefix}/{id}/{filename}
 *   - a full external URL (e.g. a hotlinked seed image from
 *     https://loremflickr.com/...), which is already a complete,
 *     directly loadable address
 *
 * Every image_url accessor in this codebase used to assume only the
 * first case and unconditionally wrapped the value in the /api/storage
 * path, which double-wraps an external URL into something like
 * /api/storage/architect_projects/5/https%3A%2F%2Floremflickr.com%2F...
 * -- a request that 404s, so the image silently fails to load. This is
 * the one place that decides which case applies, so every accessor
 * stays correct together instead of drifting out of sync the way the
 * four separate copies of this logic already had.
 */
class ImageUrl
{
    public static function resolve(?string $imagePath, string $localPathPrefix): ?string
    {
        $path = trim((string) $imagePath);

        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        // config('app.url') defaults to Laravel's own 'http://localhost'
        // when APP_URL is unset, which is exactly what shipped to
        // production here -- every genuinely locally-uploaded image was
        // resolving to a URL nobody's browser could reach. url('/')
        // falls back to the current request's own host when config is
        // missing, which is at least reachable, unlike a hardcoded
        // localhost.
        $configured = config('app.url');
        $baseUrl = rtrim(
            (is_string($configured) && $configured !== '' && !str_contains($configured, '://localhost'))
                ? $configured
                : url('/'),
            '/'
        );

        return "{$baseUrl}/api/storage/{$localPathPrefix}/" . rawurlencode($path);
    }
}
