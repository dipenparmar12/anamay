<?php

declare(strict_types=1);

namespace Anamay\Donation;

use Anamay\Config;
use Anamay\HttpError;
use Anamay\Request;
use Anamay\Response;
use Anamay\Support\RateLimiter;

/**
 * The donation flow: an order is created here, the browser opens the provider's checkout, and the outcome is
 * confirmed on this server (the checkout's signature, and the provider's webhook). The browser is never trusted
 * to say that a payment succeeded.
 */
final class DonationService
{
    private const ORDER_ID = '/^order_[A-Za-z0-9_]{6,40}$/';
    private const PAYMENT_ID = '/^pay_[A-Za-z0-9_]{6,40}$/';

    /** @param array<string,mixed> $settings see config/donation.php */
    public function __construct(
        private Config $config,
        private ?PaymentProvider $provider,
        private DonationLedger $ledger,
        private RateLimiter $limiter,
        private array $settings,
    ) {
    }

    /** What the donation form in the browser needs: amounts, the fields to ask for and how to open the checkout. */
    public function publicConfig(): Response
    {
        $provider = $this->provider();
        return new Response(200, [
            'currency' => $this->settings['currency'], 'symbol' => $this->settings['symbol'],
            'minAmount' => $this->min(), 'maxAmount' => $this->max(), 'presets' => $this->presets(),
            'merchantName' => $this->settings['merchantName'], 'description' => $this->settings['description'], 'themeColor' => $this->settings['themeColor'],
            'fields' => array_map(static fn (array $f): array => array_intersect_key($f, array_flip(['name', 'label', 'type', 'maxlength', 'autocomplete', 'inputmode', 'pattern', 'uppercase'])) + ['required' => $f['required'] ?? true], $this->settings['fields']),
            'checkout' => $provider->publicConfig(),
        ]);
    }

    public function createOrder(Request $request): Response
    {
        $provider = $this->provider();
        if (!$this->limiter->allow('donation-order', $request->ip, $this->config->int('DONATION_RATE_LIMIT', 10), $this->config->int('DONATION_RATE_WINDOW', 3600))) {
            throw new HttpError(429, 'too_many_requests');
        }
        $input = $request->json();
        [$donor, $errors] = $this->validateDonor(is_array($input['donor'] ?? null) ? $input['donor'] : []);
        $amount = $this->wholeRupees($input['amount'] ?? null);
        if ($amount === null) {
            $errors['amount'] = 'Please enter a whole number of rupees.';
        } elseif ($amount < $this->min() || $amount > $this->max()) {
            $errors['amount'] = "Please give between {$this->settings['symbol']}{$this->min()} and {$this->settings['symbol']}{$this->max()}.";
        }
        if ($errors !== []) {
            throw new HttpError(422, 'validation_failed', ['errors' => $errors]);
        }

        $receipt = 'don_' . bin2hex(random_bytes(8));
        try {
            $order = $provider->createOrder($amount * 100, $this->settings['currency'], $receipt, [
                'donor_name' => $donor['name'] ?? '', 'donor_email' => $donor['email'] ?? '', 'donor_phone' => $donor['phone'] ?? '',
                'address' => $donor['address'] ?? '', 'city' => $donor['city'] ?? '', 'state' => $donor['state'] ?? '',
                'pincode' => $donor['pincode'] ?? '', 'pan_number' => $donor['pan'] ?? '', 'source' => 'website',
            ]);
        } catch (ProviderException $e) {
            error_log('donation: ' . $e->getMessage());
            throw new HttpError(502, 'provider_unavailable');
        }
        $this->ledger->record([
            'order_id' => $order['orderId'], 'event' => 'order_created', 'status' => 'created',
            'amount' => self::major($order['amountMinor']), 'currency' => $order['currency'],
            'donor_name' => $donor['name'] ?? '', 'donor_email' => $donor['email'] ?? '', 'provider' => $provider->name(), 'note' => $receipt,
        ]);
        return new Response(201, ['orderId' => $order['orderId'], 'amount' => $order['amountMinor'], 'currency' => $order['currency'], 'receipt' => $receipt]);
    }

    /** The browser reports a finished checkout: believed only when the provider's signature matches. */
    public function verify(Request $request): Response
    {
        $provider = $this->provider();
        $input = $request->json();
        $orderId = (string) ($input['orderId'] ?? '');
        $paymentId = (string) ($input['paymentId'] ?? '');
        $signature = (string) ($input['signature'] ?? '');
        if (!preg_match(self::ORDER_ID, $orderId) || !preg_match(self::PAYMENT_ID, $paymentId) || !preg_match('/^[a-f0-9]{64}$/', $signature)) {
            throw new HttpError(400, 'invalid_request');
        }
        if ($this->ledger->status($orderId) === null) {
            throw new HttpError(404, 'unknown_order');
        }
        if (!$provider->verifyPayment($orderId, $paymentId, $signature)) {
            $this->ledger->record(['order_id' => $orderId, 'event' => 'signature_invalid', 'status' => '', 'payment_id' => $paymentId, 'provider' => $provider->name()]);
            throw new HttpError(400, 'unverified');
        }
        $this->ledger->record(['order_id' => $orderId, 'event' => 'checkout_verified', 'status' => 'paid', 'payment_id' => $paymentId, 'provider' => $provider->name()]);
        return new Response(200, ['status' => 'paid']);
    }

    /** The donor closed the checkout. Only noted when nothing else happened to the order yet. */
    public function cancel(Request $request): Response
    {
        $orderId = (string) ($request->json()['orderId'] ?? '');
        if (!preg_match(self::ORDER_ID, $orderId)) {
            throw new HttpError(400, 'invalid_request');
        }
        if ($this->ledger->status($orderId) === 'created') {
            $this->ledger->record(['order_id' => $orderId, 'event' => 'checkout_closed', 'status' => 'cancelled', 'provider' => $this->provider()->name()]);
        }
        return new Response(200, ['status' => $this->ledger->status($orderId) ?? 'unknown']);
    }

    public function status(Request $request): Response
    {
        $this->provider();
        $orderId = $request->query['order'] ?? '';
        if (!preg_match(self::ORDER_ID, $orderId)) {
            throw new HttpError(400, 'invalid_request');
        }
        $status = $this->ledger->status($orderId);
        if ($status === null) {
            throw new HttpError(404, 'unknown_order');
        }
        return new Response(200, ['status' => $status]);
    }

    /** The provider tells us, server to server, what happened to a payment. */
    public function webhook(Request $request): Response
    {
        $provider = $this->provider();
        try {
            $event = $provider->parseWebhook($request->body, $request->headers);
        } catch (InvalidWebhook $e) {
            error_log('donation webhook refused: ' . $e->getMessage());
            throw new HttpError(400, 'invalid_webhook');
        }
        if ($event === null) {
            return new Response(200, ['ignored' => true]);
        }
        if ($this->ledger->hasProviderEvent($event['id'])) {
            return new Response(200, ['duplicate' => true]);
        }
        // an account-wide webhook also reports payments made elsewhere (for example the old payment button): keep them, marked
        $ours = $event['orderId'] !== '' && $this->ledger->status($event['orderId']) !== null;
        $this->ledger->record([
            'order_id' => $event['orderId'], 'event' => 'webhook:' . $event['name'], 'status' => $event['type'],
            'amount' => self::major($event['amountMinor']), 'currency' => $event['currency'], 'payment_id' => $event['paymentId'],
            'provider_event_id' => $event['id'], 'provider' => $provider->name(),
            'note' => trim(($ours ? '' : 'not created on this website. ') . $event['note']),
        ]);
        return new Response(200, ['ok' => true]);
    }

    private function provider(): PaymentProvider
    {
        return $this->provider ?? throw new HttpError(503, 'donations_disabled');
    }

    private function min(): int
    {
        return $this->config->int('DONATION_MIN_AMOUNT', (int) $this->settings['minAmount']);
    }

    private function max(): int
    {
        return $this->config->int('DONATION_MAX_AMOUNT', (int) $this->settings['maxAmount']);
    }

    /** @return list<int> */
    private function presets(): array
    {
        $fromEnv = array_values(array_filter(array_map('intval', $this->config->list('DONATION_PRESETS')), static fn (int $n): bool => $n > 0));
        return $fromEnv ?: $this->settings['presets'];
    }

    private function wholeRupees(mixed $value): ?int
    {
        if (is_string($value) && ctype_digit($value) && strlen($value) <= 9) {
            return (int) $value;
        }
        if (is_int($value) && $value > 0) {
            return $value;
        }
        return is_float($value) && $value > 0 && floor($value) === $value && $value < 1e9 ? (int) $value : null;
    }

    private static function major(int $minor): string
    {
        return number_format($minor / 100, 2, '.', '');
    }

    /** @return array{0:array<string,string>,1:array<string,string>} the cleaned fields and the errors by field */
    private function validateDonor(array $donor): array
    {
        $clean = [];
        $errors = [];
        foreach ($this->settings['fields'] as $field) {
            $name = $field['name'];
            $raw = $donor[$name] ?? '';
            $value = is_scalar($raw) ? trim((string) preg_replace('/\s+/u', ' ', (string) $raw)) : '';
            if (!empty($field['uppercase'])) {
                $value = mb_strtoupper($value);
            }
            if ($value === '') {
                if ($field['required'] ?? true) {
                    $errors[$name] = $field['error'];
                }
                continue;
            }
            $valid = mb_strlen($value) <= $field['maxlength']
                && (($field['type'] ?? '') !== 'email' || filter_var($value, FILTER_VALIDATE_EMAIL) !== false)
                && (!isset($field['validate']) || preg_match($field['validate'], $value) === 1);
            if (!$valid) {
                $errors[$name] = $field['error'];
                continue;
            }
            $clean[$name] = $value;
        }
        return [$clean, $errors];
    }
}
