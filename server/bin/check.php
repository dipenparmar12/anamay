<?php

declare(strict_types=1);

// Checks the settings of this server and says what is missing:  php bin/check.php

use Anamay\Config;
use Anamay\ConfigError;

require __DIR__ . '/../vendor/autoload.php';

$config = Config::load(dirname(__DIR__));
$problems = [];
$say = static function (string $mark, string $text): void {
    echo "[{$mark}] {$text}\n";
};

$say('i', 'APP_ENV=' . $config->env() . ($config->isProduction() ? ' (strictest rules)' : ''));
foreach (['curl', 'json', 'mbstring', 'openssl'] as $extension) {
    if (!extension_loaded($extension)) {
        $problems[] = "PHP extension {$extension} is not enabled.";
    }
}
if (PHP_VERSION_ID < 80100) {
    $problems[] = 'PHP 8.1 or newer is needed (this is ' . PHP_VERSION . ').';
}
try {
    $config->timezone();
} catch (Throwable) {
    $problems[] = 'APP_TIMEZONE is not a time zone name.';
}

foreach (['STORAGE_DIR' => 'storage', 'LEDGER_DIR' => 'storage/ledger'] as $key => $default) {
    $dir = $config->path($key, $default);
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) {
        $problems[] = "{$key} ({$dir}) does not exist and cannot be created.";
    } elseif (!is_writable($dir)) {
        $problems[] = "{$key} ({$dir}) is not writable by this user.";
    }
}
if ($config->list('CORS_ALLOWED_ORIGINS') === []) {
    $problems[] = 'CORS_ALLOWED_ORIGINS is empty: browsers will refuse to call this API.';
}

// contact form
$contact = ['CONTACT_TO'];
if (strtolower($config->string('MAIL_TRANSPORT', 'smtp')) === 'smtp') {
    $contact = [...$contact, 'SMTP_HOST', 'MAIL_FROM_ADDRESS'];
    if ($config->string('SMTP_USERNAME') !== '') {
        $contact[] = 'SMTP_PASSWORD';
    }
} elseif ($config->isProduction()) {
    $problems[] = 'MAIL_TRANSPORT=log cannot be used in production.';
}
foreach ($contact as $key) {
    if ($config->string($key) === '') {
        $problems[] = "{$key} is missing (contact form).";
    }
}

// donations
$provider = strtolower($config->string('DONATION_PROVIDER'));
if ($provider === '' || $provider === 'none') {
    $say('i', 'Donations: off (DONATION_PROVIDER is empty).');
} elseif ($provider === 'razorpay') {
    foreach (['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'] as $key) {
        if ($config->string($key) === '') {
            $problems[] = "{$key} is missing (donations).";
        }
    }
    $expected = $config->isProduction() ? 'rzp_live_' : 'rzp_test_';
    if ($config->string('RAZORPAY_KEY_ID') !== '' && !str_starts_with($config->string('RAZORPAY_KEY_ID'), $expected)) {
        $problems[] = "RAZORPAY_KEY_ID must start with {$expected} when APP_ENV is {$config->env()}.";
    }
} elseif ($provider === 'fake' && !$config->isProduction()) {
    $say('i', 'Donations: fake provider (development only).');
} else {
    $problems[] = 'DONATION_PROVIDER must be razorpay or none' . ($config->isProduction() ? '.' : ' (or fake while developing).');
}

if ($problems === []) {
    $say('ok', 'Settings look complete.');
    exit(0);
}
foreach ($problems as $problem) {
    $say('!!', $problem);
}
exit(1);
