<?php

declare(strict_types=1);

// Entry point of the contact and donation API. Point the web server's document root at this folder.

use Anamay\App;
use Anamay\Config;
use Anamay\HttpError;
use Anamay\Request;
use Anamay\Response;

require __DIR__ . '/../vendor/autoload.php';

try {
    $config = Config::load(dirname(__DIR__));
    (new App($config))->handle(Request::fromGlobals($config))->send();
} catch (HttpError $e) {
    (new Response($e->status, ['error' => $e->error]))->send();
} catch (Throwable $e) {
    error_log(sprintf('startup error: %s in %s:%d', $e->getMessage(), $e->getFile(), $e->getLine()));
    (new Response(500, ['error' => 'server_error']))->send();
}
