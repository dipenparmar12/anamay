<?php

declare(strict_types=1);

namespace Anamay\Donation\Providers;

/**
 * For development and tests only (refused in production): orders are made up here instead of at Razorpay, while
 * signatures and webhooks are checked exactly as for Razorpay, with the secrets below.
 */
final class FakeProvider extends RazorpayProvider
{
    public const KEY_SECRET = 'fake-key-secret';
    public const WEBHOOK_SECRET = 'fake-webhook-secret';

    public function __construct()
    {
        parent::__construct('rzp_test_fake', self::KEY_SECRET, self::WEBHOOK_SECRET);
    }

    public function name(): string
    {
        return 'fake';
    }

    public function createOrder(int $amountMinor, string $currency, string $receipt, array $notes): array
    {
        return ['orderId' => 'order_fake' . bin2hex(random_bytes(6)), 'amountMinor' => $amountMinor, 'currency' => $currency];
    }
}
