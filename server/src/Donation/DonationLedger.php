<?php

declare(strict_types=1);

namespace Anamay\Donation;

use Anamay\Support\Clock;
use Anamay\Support\CsvLedger;

/**
 * Every step of a donation is appended as a row (order created, signature checked, webhook received, ...),
 * so the file doubles as an audit trail. The status of an order is read from its rows; once an order is
 * paid it stays paid. Card numbers, PAN and addresses are never written here.
 */
final class DonationLedger
{
    public const COLUMNS = ['logged_utc', 'date', 'time', 'order_id', 'event', 'status', 'amount', 'currency', 'payment_id', 'provider_event_id', 'donor_name', 'donor_email', 'provider', 'note'];
    public const STATUSES = ['created', 'pending', 'paid', 'failed', 'cancelled'];

    public function __construct(private CsvLedger $csv, private Clock $clock)
    {
    }

    /** @param array<string,scalar|null> $row */
    public function record(array $row): void
    {
        $stamp = $this->clock->stamp();
        $this->csv->append(['logged_utc' => $stamp['utc'], 'date' => $stamp['date'], 'time' => $stamp['time']] + $row);
    }

    /** @return string|null created, pending, paid, failed or cancelled; null for an order we never saw */
    public function status(string $orderId): ?string
    {
        $status = null;
        foreach ($this->csv->rows() as $row) {
            if ($row['order_id'] === $orderId && in_array($row['status'], self::STATUSES, true) && $status !== 'paid') {
                $status = $row['status'];
            }
        }
        return $status;
    }

    /** Whether a webhook delivery with this id was already handled (providers repeat deliveries). */
    public function hasProviderEvent(string $eventId): bool
    {
        foreach ($this->csv->rows() as $row) {
            if ($row['provider_event_id'] === $eventId) {
                return true;
            }
        }
        return false;
    }
}
