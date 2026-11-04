<?php

declare(strict_types=1);

namespace Anamay\Mail;

/** For development and tests: writes each message to a text file instead of sending it. */
final class LogMailer implements MailTransport
{
    public function __construct(private string $dir)
    {
    }

    public function send(MailMessage $message): void
    {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0750, true) && !is_dir($this->dir)) {
            throw new MailException('The mail folder cannot be created.');
        }
        $text = "To: {$message->to}\n"
            . ($message->replyTo !== null ? "Reply-To: {$message->replyToName} <{$message->replyTo}>\n" : '')
            . "Subject: {$message->subject}\n\n{$message->body}\n";
        $name = $this->dir . '/' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.txt';
        if (file_put_contents($name, $text) === false) {
            throw new MailException('The mail file cannot be written.');
        }
    }
}
