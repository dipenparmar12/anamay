<?php

declare(strict_types=1);

namespace Anamay;

/** An error the caller is told about: the HTTP status, a short code and optional details (never internals). */
final class HttpError extends \Exception
{
    /** @param array<string,mixed> $extra */
    public function __construct(public readonly int $status, public readonly string $error, public readonly array $extra = [])
    {
        parent::__construct($error);
    }
}
