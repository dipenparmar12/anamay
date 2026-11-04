<?php

declare(strict_types=1);

namespace Anamay;

use Anamay\Contact\ContactService;
use Anamay\Donation\DonationLedger;
use Anamay\Donation\DonationService;
use Anamay\Donation\PaymentProvider;
use Anamay\Donation\Providers\FakeProvider;
use Anamay\Donation\Providers\RazorpayProvider;
use Anamay\Mail\LogMailer;
use Anamay\Mail\MailTransport;
use Anamay\Mail\SmtpMailer;
use Anamay\Support\Clock;
use Anamay\Support\CsvLedger;
use Anamay\Support\RateLimiter;

/** Wires the settings to the services and routes a request to one of them. */
final class App
{
    private Clock $clock;

    public function __construct(private Config $config, ?Clock $clock = null)
    {
        $this->clock = $clock ?? new Clock($config->timezone());
    }

    public function handle(Request $request): Response
    {
        $cors = $this->corsHeaders($request);
        try {
            if ($request->method === 'OPTIONS') {
                return new Response(204, [], $cors);
            }
            // a browser page on another site must not drive the forms (webhooks are server to server and send no Origin)
            if ($request->header('origin') !== null && $cors === [] && $request->method !== 'GET') {
                throw new HttpError(403, 'origin_not_allowed');
            }
            $response = $this->route($request);
            return new Response($response->status, $response->body, $response->headers + $cors);
        } catch (HttpError $e) {
            return new Response($e->status, ['error' => $e->error] + $e->extra, $cors);
        } catch (\Throwable $e) {
            error_log(sprintf('server error: %s in %s:%d', $e->getMessage(), $e->getFile(), $e->getLine()));
            return new Response(500, ['error' => 'server_error'], $cors);
        }
    }

    private function route(Request $request): Response
    {
        return match ($request->method . ' ' . $request->path) {
            'GET /health' => new Response(200, ['status' => 'ok']),
            'POST /contact' => $this->contact()->submit($request),
            'GET /donations/config' => $this->donations()->publicConfig(),
            'POST /donations/orders' => $this->donations()->createOrder($request),
            'POST /donations/verify' => $this->donations()->verify($request),
            'POST /donations/cancel' => $this->donations()->cancel($request),
            'GET /donations/status' => $this->donations()->status($request),
            'POST /webhooks/razorpay' => $this->donations()->webhook($request),
            default => throw new HttpError(404, 'not_found'),
        };
    }

    /** @return array<string,string> */
    private function corsHeaders(Request $request): array
    {
        $origin = $request->header('origin');
        if ($origin === null || !in_array(rtrim($origin, '/'), array_map(static fn (string $o): string => rtrim($o, '/'), $this->config->list('CORS_ALLOWED_ORIGINS')), true)) {
            return [];
        }
        return [
            'Access-Control-Allow-Origin' => $origin, 'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers' => 'Content-Type', 'Access-Control-Max-Age' => '86400',
        ];
    }

    private function contact(): ContactService
    {
        return new ContactService(
            $this->config,
            new CsvLedger($this->ledgerDir() . '/contact-submissions.csv', ContactService::COLUMNS),
            $this->mailer(),
            new RateLimiter($this->storageDir() . '/ratelimit'),
            $this->clock,
        );
    }

    private function donations(): DonationService
    {
        /** @var array<string,mixed> $settings */
        $settings = require $this->config->root . '/config/donation.php';
        return new DonationService(
            $this->config,
            $this->paymentProvider(),
            new DonationLedger(new CsvLedger($this->ledgerDir() . '/donations.csv', DonationLedger::COLUMNS), $this->clock),
            new RateLimiter($this->storageDir() . '/ratelimit'),
            $settings,
        );
    }

    private function mailer(): MailTransport
    {
        return match (strtolower($this->config->string('MAIL_TRANSPORT', 'smtp'))) {
            'smtp' => new SmtpMailer($this->config),
            'log' => $this->config->isProduction()
                ? throw new ConfigError('MAIL_TRANSPORT=log is only for development; production must use smtp.')
                : new LogMailer($this->storageDir() . '/mail'),
            default => throw new ConfigError('MAIL_TRANSPORT must be smtp or log.'),
        };
    }

    /** null when donations are switched off (DONATION_PROVIDER empty or none) */
    private function paymentProvider(): ?PaymentProvider
    {
        return match (strtolower($this->config->string('DONATION_PROVIDER'))) {
            '', 'none' => null,
            'razorpay' => $this->razorpay(),
            'fake' => $this->config->isProduction()
                ? throw new ConfigError('DONATION_PROVIDER=fake is only for development.')
                : new FakeProvider(),
            default => throw new ConfigError('DONATION_PROVIDER must be razorpay, fake or none.'),
        };
    }

    private function razorpay(): RazorpayProvider
    {
        $keyId = $this->config->require('RAZORPAY_KEY_ID');
        // live keys only in production and test keys only elsewhere, so a rehearsal can never take a real payment
        $expected = $this->config->isProduction() ? 'rzp_live_' : 'rzp_test_';
        if (!str_starts_with($keyId, $expected)) {
            throw new ConfigError("RAZORPAY_KEY_ID must start with {$expected} when APP_ENV is {$this->config->env()}.");
        }
        return new RazorpayProvider($keyId, $this->config->require('RAZORPAY_KEY_SECRET'), $this->config->string('RAZORPAY_WEBHOOK_SECRET'));
    }

    private function storageDir(): string
    {
        return $this->config->path('STORAGE_DIR', 'storage');
    }

    private function ledgerDir(): string
    {
        return $this->config->path('LEDGER_DIR', 'storage/ledger');
    }
}
