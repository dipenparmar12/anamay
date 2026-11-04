<?php

declare(strict_types=1);

namespace Anamay\Support;

/** The current time in the site's time zone; tests can fix it. */
final class Clock
{
    public function __construct(private \DateTimeZone $zone, private ?\Closure $now = null)
    {
    }

    public function now(): \DateTimeImmutable
    {
        $now = $this->now ? ($this->now)() : new \DateTimeImmutable('now');
        return $now->setTimezone($this->zone);
    }

    /** @return array{utc:string,date:string,time:string} the same instant for the ledgers: UTC, and local date and time */
    public function stamp(): array
    {
        $now = $this->now();
        return [
            'utc' => $now->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
            'date' => $now->format('Y-m-d'),
            'time' => $now->format('H:i:s'),
        ];
    }
}
