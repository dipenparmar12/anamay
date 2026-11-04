<?php

declare(strict_types=1);

namespace Anamay\Donation;

/**
 * What the donation code needs from a payment service. To use another provider, write a class with these
 * methods and name it in DonationFactory; nothing else changes.
 */
interface PaymentProvider
{
    public function name(): string;

    /**
     * Values the browser needs to open the provider's checkout (never a secret).
     *
     * @return array<string,string>
     */
    public function publicConfig(): array;

    /**
     * @param array<string,string> $notes extra details kept with the order at the provider
     * @return array{orderId:string,amountMinor:int,currency:string}
     * @throws ProviderException
     */
    public function createOrder(int $amountMinor, string $currency, string $receipt, array $notes): array;

    /** True only when the signature the checkout returned proves this payment belongs to this order. */
    public function verifyPayment(string $orderId, string $paymentId, string $signature): bool;

    /**
     * Checks and reads a webhook call.
     *
     * @param array<string,string> $headers lower-case names
     * @return array{id:string,type:'paid'|'pending'|'failed',name:string,orderId:string,paymentId:string,amountMinor:int,currency:string,note:string}|null null for events we do not track
     * @throws InvalidWebhook when the signature is wrong or the body is not understood
     */
    public function parseWebhook(string $rawBody, array $headers): ?array;
}
