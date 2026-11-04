<?php

declare(strict_types=1);

namespace Anamay\Contact;

use Anamay\Config;
use Anamay\HttpError;
use Anamay\Mail\MailException;
use Anamay\Mail\MailMessage;
use Anamay\Mail\MailTransport;
use Anamay\Request;
use Anamay\Response;
use Anamay\Support\Clock;
use Anamay\Support\CsvLedger;
use Anamay\Support\RateLimiter;

/**
 * The enquiry form: checks the message, keeps a row in the CSV ledger and e-mails it to the ashram.
 * The recipient is always chosen here from the settings (by channel), never taken from the form.
 */
final class ContactService
{
    public const COLUMNS = ['id', 'date', 'time', 'received_utc', 'channel', 'name', 'email', 'phone', 'interest', 'subject', 'age', 'arrival', 'message', 'mail_status'];

    public function __construct(
        private Config $config,
        private CsvLedger $ledger,
        private MailTransport $mailer,
        private RateLimiter $limiter,
        private Clock $clock,
    ) {
    }

    public function submit(Request $request): Response
    {
        $input = $request->json();

        // bots fill every field and answer at once: pretend all is well, keep nothing
        $elapsed = is_numeric($input['elapsed'] ?? null) ? (int) $input['elapsed'] : 0;
        if (trim((string) ($input['website'] ?? '')) !== '' || $elapsed < $this->config->int('CONTACT_MIN_FILL_MS', 2000)) {
            return new Response(201, ['status' => 'received']);
        }
        if (!$this->limiter->allow('contact', $request->ip, $this->config->int('CONTACT_RATE_LIMIT', 5), $this->config->int('CONTACT_RATE_WINDOW', 600))) {
            throw new HttpError(429, 'too_many_requests');
        }

        [$data, $errors] = $this->validate($input);
        if ($errors !== []) {
            throw new HttpError(422, 'validation_failed', ['errors' => $errors]);
        }

        $stamp = $this->clock->stamp();
        $row = ['id' => bin2hex(random_bytes(6)), 'date' => $stamp['date'], 'time' => $stamp['time'], 'received_utc' => $stamp['utc']] + $data;

        $row['mail_status'] = 'sent';
        try {
            $this->mailer->send($this->message($row));
        } catch (MailException $e) {
            $row['mail_status'] = 'failed';
            error_log('contact: mail failed (' . $row['id'] . '): ' . $e->getMessage());
        }
        try {
            $this->ledger->append($row);
        } catch (\Throwable $e) {
            error_log('contact: ledger failed (' . $row['id'] . '): ' . $e->getMessage());
            if ($row['mail_status'] === 'failed') {
                throw new HttpError(500, 'delivery_failed'); // neither copy exists: the visitor must know
            }
        }
        return new Response(201, ['status' => 'received', 'id' => $row['id']]);
    }

    /** @return array{0:array<string,string>,1:array<string,string>} the cleaned fields and the errors by field */
    private function validate(array $input): array
    {
        $errors = [];
        $text = static function (mixed $value, int $max): string {
            $value = is_scalar($value) ? (string) $value : '';
            $value = trim((string) preg_replace('/(?![\n\t])\p{Cc}/u', '', $value)); // control characters out (joiners used in Indic scripts stay)
            return mb_substr($value, 0, $max);
        };
        $line = static fn (mixed $value, int $max): string => trim((string) preg_replace('/\s+/u', ' ', $text($value, $max)));

        $name = $line($input['name'] ?? '', 100);
        if ($name === '') {
            $errors['name'] = 'Please tell us your name.';
        }
        $email = $line($input['email'] ?? '', 150);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Please enter a valid email.';
        }
        $phone = $line($input['phone'] ?? '', 30);
        if ($phone !== '' && !preg_match('/^[0-9 +()\-]{7,30}$/', $phone)) {
            $errors['phone'] = 'Please check the number.';
        }
        $age = $line($input['age'] ?? '', 3);
        if ($age !== '' && (!ctype_digit($age) || (int) $age < 5 || (int) $age > 110)) {
            $errors['age'] = 'Please check the age.';
        }
        $arrival = $line($input['arrival'] ?? '', 10);
        if ($arrival !== '' && !(preg_match('/^\d{4}-\d{2}-\d{2}$/', $arrival) && checkdate((int) substr($arrival, 5, 2), (int) substr($arrival, 8, 2), (int) substr($arrival, 0, 4)))) {
            $errors['arrival'] = 'Please check the date.';
        }
        $message = $text($input['message'] ?? '', 5000);
        if (mb_strlen($message) < 10) {
            $errors['message'] = 'Please write a short message.';
        }
        $channel = ($input['channel'] ?? 'ashram') === 'retreat' ? 'retreat' : 'ashram';

        return [[
            'channel' => $channel, 'name' => $name, 'email' => $email, 'phone' => $phone,
            'interest' => $line($input['interest'] ?? '', 120),
            'subject' => $line($input['subject'] ?? '', 150) ?: 'Enquiry from the website',
            'age' => $age, 'arrival' => $arrival, 'message' => $message,
        ], $errors];
    }

    /** @param array<string,string> $row */
    private function message(array $row): MailMessage
    {
        $to = $row['channel'] === 'retreat'
            ? ($this->config->string('CONTACT_TO_RETREAT') ?: $this->config->require('CONTACT_TO'))
            : $this->config->require('CONTACT_TO');
        $details = array_filter([
            'Name' => $row['name'], 'Email' => $row['email'], 'Mobile' => $row['phone'], 'Interested in' => $row['interest'],
            'Age' => $row['age'], 'Tentative arrival' => $row['arrival'],
        ], static fn (string $v): bool => $v !== '');
        $body = "New message from the website ({$row['channel']})\n\n"
            . implode("\n", array_map(static fn (string $k, string $v): string => "{$k}: {$v}", array_keys($details), $details))
            . "\n\nMessage:\n{$row['message']}\n\n--\nReceived {$row['date']} {$row['time']} ({$this->clock->now()->format('T')}), reference {$row['id']}.\nReply to this email to answer the visitor.\n";
        return new MailMessage($to, "[Website] {$row['subject']} - {$row['name']}", $body, $row['email'], $row['name']);
    }
}
