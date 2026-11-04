<?php

declare(strict_types=1);

namespace Anamay\Mail;

interface MailTransport
{
    /** @throws MailException when the message could not be handed to the mail server */
    public function send(MailMessage $message): void;
}
