<?php

declare(strict_types=1);

namespace Anamay\Donation\Providers;

use Anamay\Donation\InvalidWebhook;
use Anamay\Donation\PaymentProvider;
use Anamay\Donation\ProviderException;
use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

/**
 * Razorpay through its official PHP SDK: an order is created here with the secret key, the browser opens
 * Razorpay Checkout for that order, and the result is confirmed by checking Razorpay's signature on this server.
 * Settings: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
 */
class RazorpayProvider implements PaymentProvider
{
    public function __construct(
        protected string $keyId,
        protected string $keySecret,
        protected string $webhookSecret = '',
        protected string $checkoutScript = 'https://checkout.razorpay.com/v1/checkout.js',
    ) {
    }

    public function name(): string
    {
        return 'razorpay';
    }

    public function publicConfig(): array
    {
        return ['provider' => 'razorpay', 'keyId' => $this->keyId, 'checkoutScript' => $this->checkoutScript];
    }

    public function createOrder(int $amountMinor, string $currency, string $receipt, array $notes): array
    {
        try {
            $order = $this->api()->order->create(['amount' => $amountMinor, 'currency' => $currency, 'receipt' => $receipt, 'notes' => $notes]);
        } catch (\Throwable $e) {
            throw new ProviderException('Razorpay refused the order: ' . $e->getMessage(), 0, $e);
        }
        $id = (string) ($order['id'] ?? '');
        if ($id === '') {
            throw new ProviderException('Razorpay returned no order id.');
        }
        return ['orderId' => $id, 'amountMinor' => (int) ($order['amount'] ?? $amountMinor), 'currency' => (string) ($order['currency'] ?? $currency)];
    }

    public function verifyPayment(string $orderId, string $paymentId, string $signature): bool
    {
        try {
            $this->api()->utility->verifyPaymentSignature([
                'razorpay_order_id' => $orderId, 'razorpay_payment_id' => $paymentId, 'razorpay_signature' => $signature,
            ]);
            return true;
        } catch (SignatureVerificationError) {
            return false;
        }
    }

    public function parseWebhook(string $rawBody, array $headers): ?array
    {
        if ($this->webhookSecret === '') {
            throw new InvalidWebhook('No webhook secret is set (RAZORPAY_WEBHOOK_SECRET).');
        }
        try {
            $this->api()->utility->verifyWebhookSignature($rawBody, $headers['x-razorpay-signature'] ?? '', $this->webhookSecret);
        } catch (SignatureVerificationError) {
            throw new InvalidWebhook('The webhook signature is wrong.');
        }
        try {
            $event = json_decode($rawBody, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidWebhook('The webhook body is not JSON.');
        }
        $name = (string) ($event['event'] ?? '');
        $type = match ($name) {
            'payment.captured', 'order.paid' => 'paid',
            'payment.authorized' => 'pending',
            'payment.failed' => 'failed',
            default => null,
        };
        if ($type === null) {
            return null;
        }
        $payment = $event['payload']['payment']['entity'] ?? [];
        $order = $event['payload']['order']['entity'] ?? [];
        return [
            // the event id lets a repeated delivery be recognised; without the header the body itself identifies it
            'id' => $headers['x-razorpay-event-id'] ?? hash('sha256', $rawBody),
            'type' => $type,
            'name' => $name,
            'orderId' => (string) ($payment['order_id'] ?? $order['id'] ?? ''),
            'paymentId' => (string) ($payment['id'] ?? ''),
            'amountMinor' => (int) ($payment['amount'] ?? $order['amount_paid'] ?? 0),
            'currency' => (string) ($payment['currency'] ?? $order['currency'] ?? 'INR'),
            'note' => (string) ($payment['error_description'] ?? ''),
        ];
    }

    protected function api(): Api
    {
        // the SDK keeps the key pair in static properties, so it is set again before each use
        return new Api($this->keyId, $this->keySecret);
    }
}
