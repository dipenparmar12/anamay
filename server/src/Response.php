<?php

declare(strict_types=1);

namespace Anamay;

final class Response
{
    /**
     * @param array<string,mixed> $body
     * @param array<string,string> $headers
     */
    public function __construct(public readonly int $status, public readonly array $body = [], public readonly array $headers = [])
    {
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        if ($this->status !== 204) {
            echo json_encode($this->body === [] ? new \stdClass() : $this->body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        }
    }
}
