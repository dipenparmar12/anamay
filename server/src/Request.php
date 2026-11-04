<?php

declare(strict_types=1);

namespace Anamay;

final class Request
{
    public const MAX_BODY = 65536;

    /**
     * @param array<string,string> $query
     * @param array<string,string> $headers lower-case names
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query = [],
        public readonly array $headers = [],
        public readonly string $body = '',
        public readonly string $ip = '0.0.0.0',
    ) {
    }

    public static function fromGlobals(Config $config): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $base = rtrim($config->string('APP_BASE_PATH'), '/');
        if ($base !== '' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base));
        }
        $path = '/' . trim((string) preg_replace('#^/index\.php#', '', $path), '/');

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (is_string($value) && str_starts_with($key, 'HTTP_')) {
                $headers[strtolower(str_replace('_', '-', substr($key, 5)))] = $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        $body = (string) file_get_contents('php://input', false, null, 0, self::MAX_BODY + 1);
        if (strlen($body) > self::MAX_BODY) {
            throw new HttpError(413, 'payload_too_large');
        }

        // behind a proxy or CDN the visitor's address is in a header the host trusts (for example CF-Connecting-IP)
        $proxyHeader = strtolower($config->string('TRUSTED_IP_HEADER'));
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        if ($proxyHeader !== '' && isset($headers[$proxyHeader])) {
            $candidate = trim(explode(',', $headers[$proxyHeader])[0]);
            $ip = filter_var($candidate, FILTER_VALIDATE_IP) ? $candidate : $ip;
        }

        return new self(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path, array_map('strval', $_GET), $headers, $body, $ip);
    }

    /** @return array<string,mixed> */
    public function json(): array
    {
        try {
            $data = json_decode($this->body, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpError(400, 'invalid_json');
        }
        if (!is_array($data) || array_is_list($data) && $data !== []) {
            throw new HttpError(400, 'invalid_json');
        }
        return $data;
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }
}
