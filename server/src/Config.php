<?php

declare(strict_types=1);

namespace Anamay;

/**
 * Settings come from environment variables. A .env file next to composer.json is read when it exists;
 * variables set by the server itself always win over the file.
 */
final class Config
{
    /** @param array<string,string> $values */
    public function __construct(private array $values, public readonly string $root)
    {
    }

    public static function load(string $root): self
    {
        if (is_file($root . '/.env')) {
            \Dotenv\Dotenv::createImmutable($root)->safeLoad();
        }
        $values = [];
        foreach ([getenv(), $_SERVER, $_ENV] as $source) {
            foreach ($source as $key => $value) {
                if (is_string($key) && is_string($value)) {
                    $values[$key] = $value;
                }
            }
        }
        return new self($values, $root);
    }

    public function string(string $key, string $default = ''): string
    {
        return trim($this->values[$key] ?? $default);
    }

    /** A value that must be set; the message names the variable, never its value. */
    public function require(string $key): string
    {
        $value = $this->string($key);
        if ($value === '') {
            throw new ConfigError("Setting {$key} is missing. See server/.env.example.");
        }
        return $value;
    }

    public function bool(string $key, bool $default = false): bool
    {
        $value = strtolower($this->string($key));
        return $value === '' ? $default : in_array($value, ['1', 'true', 'yes', 'on'], true);
    }

    public function int(string $key, int $default): int
    {
        $value = $this->string($key);
        return $value === '' ? $default : (int) $value;
    }

    /** @return list<string> */
    public function list(string $key): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $this->string($key)))));
    }

    /** local, testing, staging or production. Anything else counts as production, the strictest. */
    public function env(): string
    {
        $env = strtolower($this->string('APP_ENV', 'production'));
        return in_array($env, ['local', 'testing', 'staging'], true) ? $env : 'production';
    }

    public function isProduction(): bool
    {
        return $this->env() === 'production';
    }

    /** A folder setting, absolute or relative to the server folder. */
    public function path(string $key, string $default): string
    {
        $path = $this->string($key, $default);
        return preg_match('#^([A-Za-z]:[\\\\/]|/)#', $path) === 1 ? $path : $this->root . '/' . $path;
    }

    public function timezone(): \DateTimeZone
    {
        return new \DateTimeZone($this->string('APP_TIMEZONE', 'Asia/Kolkata'));
    }
}
