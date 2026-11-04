<?php

declare(strict_types=1);

namespace Anamay\Support;

/** Allows a number of actions per visitor in a time window, counted in small files (no database needed). */
final class RateLimiter
{
    public function __construct(private string $dir)
    {
    }

    public function allow(string $bucket, string $visitor, int $max, int $windowSeconds): bool
    {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0750, true) && !is_dir($this->dir)) {
            return true; // a broken counter must not stop a real visitor from writing to the ashram
        }
        $file = fopen($this->dir . '/' . hash('sha256', $bucket . '|' . $visitor) . '.json', 'c+');
        if ($file === false || !flock($file, LOCK_EX)) {
            return true;
        }
        try {
            $now = time();
            $hits = json_decode((string) stream_get_contents($file), true);
            $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn ($t): bool => is_int($t) && $t > $now - $windowSeconds));
            if (count($hits) >= $max) {
                return false;
            }
            $hits[] = $now;
            ftruncate($file, 0);
            rewind($file);
            fwrite($file, json_encode($hits));
            return true;
        } finally {
            flock($file, LOCK_UN);
            fclose($file);
            $this->sweep();
        }
    }

    /** now and then, forget counters that are older than a day */
    private function sweep(): void
    {
        if (random_int(1, 100) !== 1) {
            return;
        }
        foreach (glob($this->dir . '/*.json') ?: [] as $old) {
            if (filemtime($old) < time() - 86400) {
                @unlink($old);
            }
        }
    }
}
