<?php

declare(strict_types=1);

namespace Anamay\Mail;

use Anamay\Config;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use PHPMailer\PHPMailer\PHPMailer;

/** Sends through the SMTP server named in the settings (SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION, SMTP_USERNAME, SMTP_PASSWORD). */
final class SmtpMailer implements MailTransport
{
    public function __construct(private Config $config)
    {
    }

    public function send(MailMessage $message): void
    {
        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $this->config->require('SMTP_HOST');
            $mail->Port = $this->config->int('SMTP_PORT', 587);
            $mail->Timeout = 15;
            $mail->CharSet = PHPMailer::CHARSET_UTF8;

            $encryption = strtolower($this->config->string('SMTP_ENCRYPTION', 'tls'));
            if ($encryption === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($encryption === 'none') {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $username = $this->config->string('SMTP_USERNAME');
            if ($username !== '') {
                $mail->SMTPAuth = true;
                $mail->Username = $username;
                $mail->Password = $this->config->require('SMTP_PASSWORD');
            }

            // a fixed sender in our own domain; the visitor's address goes in Reply-To, never in From
            $mail->setFrom($this->config->require('MAIL_FROM_ADDRESS'), $this->config->string('MAIL_FROM_NAME', 'Anāmay Ashram website'));
            $mail->addAddress($message->to);
            if ($message->replyTo !== null && !$mail->addReplyTo($message->replyTo, $message->replyToName ?? '')) {
                throw new MailException('The visitor address was refused as Reply-To.');
            }
            $mail->isHTML(false);
            $mail->Subject = $message->subject;
            $mail->Body = $message->body;
            $mail->send();
        } catch (PHPMailerException $e) {
            throw new MailException('The mail server did not accept the message: ' . $e->getMessage(), 0, $e);
        }
    }
}
