<?php

declare(strict_types=1);

// Tests of the API without a web server:  composer test   (or  php tests/run.php)

use Anamay\App;
use Anamay\Config;
use Anamay\ConfigError;
use Anamay\Contact\ContactService;
use Anamay\Donation\InvalidWebhook;
use Anamay\Donation\Providers\FakeProvider;
use Anamay\Donation\Providers\RazorpayProvider;
use Anamay\Mail\MailException;
use Anamay\Mail\MailMessage;
use Anamay\Mail\MailTransport;
use Anamay\Request;
use Anamay\Response;
use Anamay\Support\Clock;
use Anamay\Support\CsvLedger;
use Anamay\Support\RateLimiter;

require __DIR__ . '/../vendor/autoload.php';

$root = dirname(__DIR__);
$tests = [];
function test(string $name, callable $fn): void
{
    global $tests;
    $tests[$name] = $fn;
}
function same(mixed $expected, mixed $actual, string $what = ''): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(($what !== '' ? $what . ': ' : '') . 'expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}
function yes(bool $condition, string $what): void
{
    if (!$condition) {
        throw new RuntimeException('failed: ' . $what);
    }
}
function throws(callable $fn, string $class, string $what): Throwable
{
    try {
        $fn();
    } catch (Throwable $e) {
        yes($e instanceof $class, "{$what} threw " . $e::class . ' instead of ' . $class);
        return $e;
    }
    throw new RuntimeException("failed: {$what} did not throw");
}
function tempDir(): string
{
    $dir = sys_get_temp_dir() . '/anamay-test-' . bin2hex(random_bytes(4));
    mkdir($dir, 0777, true);
    return $dir;
}
function rmTree(string $dir): void
{
    foreach (glob($dir . '/{,.}*', GLOB_BRACE) ?: [] as $path) {
        if (in_array(basename($path), ['.', '..'], true)) {
            continue;
        }
        is_dir($path) ? rmTree($path) : @unlink($path);
    }
    @rmdir($dir);
}

/** @return array{0:App,1:string,2:Config} */
function makeApp(array $env = []): array
{
    global $root;
    $dir = tempDir();
    $env += [
        'APP_ENV' => 'testing', 'MAIL_TRANSPORT' => 'log', 'STORAGE_DIR' => $dir . '/storage', 'LEDGER_DIR' => $dir . '/ledger',
        'CONTACT_TO' => 'to@example.org', 'CONTACT_TO_RETREAT' => 'retreat@example.org', 'CONTACT_MIN_FILL_MS' => '0', 'CONTACT_RATE_LIMIT' => '100',
        'DONATION_PROVIDER' => 'fake', 'DONATION_RATE_LIMIT' => '100', 'CORS_ALLOWED_ORIGINS' => 'https://site.example',
    ];
    $config = new Config($env, $root);
    $clock = new Clock(new DateTimeZone('Asia/Kolkata'), fn () => new DateTimeImmutable('2026-11-04 10:42:15 UTC'));
    return [new App($config, $clock), $dir, $config];
}
function call(App $app, string $method, string $path, ?array $json = null, array $headers = [], array $query = [], ?string $raw = null, string $ip = '203.0.113.5'): Response
{
    return $app->handle(new Request($method, $path, $query, array_change_key_case($headers), $raw ?? ($json === null ? '' : json_encode($json)), $ip));
}
function readCsvFile(string $file): array
{
    $handle = fopen($file, 'rb');
    fread($handle, 3);
    $columns = fgetcsv($handle, 0, ',', '"', '');
    fclose($handle);
    return iterator_to_array((new CsvLedger($file, $columns))->rows(), false);
}
function mails(string $dir): array
{
    return array_map('file_get_contents', glob($dir . '/storage/mail/*.txt') ?: []);
}

$contact = ['name' => 'Asha Verma', 'email' => 'asha@example.com', 'phone' => '+91 98765 43210', 'interest' => 'Visiting / staying at the ashram', 'subject' => 'Enquiry from the website', 'age' => '34', 'arrival' => '2027-03-10', 'message' => 'We would like to visit in March with two children.', 'elapsed' => 9000, 'channel' => 'ashram', 'website' => ''];
$donor = ['name' => 'Ravi Kumar', 'email' => 'ravi@example.com', 'phone' => '9876543210', 'address' => '12 Park Road', 'city' => 'Haldwani', 'state' => 'Uttarakhand', 'pincode' => '263139', 'pan' => 'abcde1234f'];
$sign = fn (string $order, string $payment): string => hash_hmac('sha256', $order . '|' . $payment, FakeProvider::KEY_SECRET);
$webhook = function (App $app, string $event, string $orderId, string $eventId, ?string $secret = null, int $amount = 50000): Response {
    $body = json_encode(['event' => $event, 'payload' => ['payment' => ['entity' => ['id' => 'pay_TEST123456', 'order_id' => $orderId, 'amount' => $amount, 'currency' => 'INR', 'error_description' => $event === 'payment.failed' ? 'Card declined' : null]]]]);
    return call($app, 'POST', '/webhooks/razorpay', null, ['X-Razorpay-Signature' => hash_hmac('sha256', $body, $secret ?? FakeProvider::WEBHOOK_SECRET), 'X-Razorpay-Event-Id' => $eventId], [], $body);
};
$newOrder = function (App $app) use ($donor): string {
    $r = call($app, 'POST', '/donations/orders', ['amount' => 500, 'donor' => $donor]);
    same(201, $r->status, 'order created');
    return $r->body['orderId'];
};

/* ---------------- settings ---------------- */
test('config: required, bool, list, env and paths', function () use ($root) {
    $c = new Config(['A' => ' x ', 'B' => 'yes', 'C' => 'a, b ,,c', 'APP_ENV' => 'weird', 'D' => '12'], $root);
    same('x', $c->string('A'));
    same('x', $c->require('A'));
    throws(fn () => $c->require('MISSING'), ConfigError::class, 'a missing required setting');
    same(true, $c->bool('B'));
    same(false, $c->bool('NOPE'));
    same(['a', 'b', 'c'], $c->list('C'));
    same(12, $c->int('D', 0));
    same('production', $c->env(), 'an unknown environment counts as production');
    same(true, (new Config(['APP_ENV' => 'local'], $root))->env() === 'local');
    same('/var/data', $c->path('X', '/var/data'));
    same($root . '/storage', $c->path('X', 'storage'));
});

test('csv ledger: header once, byte order mark, quoting, formula guard, round trip', function () {
    $dir = tempDir();
    $ledger = new CsvLedger($dir . '/l/a.csv', ['a', 'b']);
    $ledger->append(['a' => "line one\nline \"two\", with comma", 'b' => 'नमस्ते']);
    $ledger->append(['a' => '=1+1', 'b' => '+91 98']);
    $raw = file_get_contents($dir . '/l/a.csv');
    same("\xEF\xBB\xBF", substr($raw, 0, 3), 'byte order mark');
    same(1, substr_count($raw, "a,b\n"), 'header written once');
    $rows = iterator_to_array($ledger->rows(), false);
    same(2, count($rows));
    same("line one\nline \"two\", with comma", $rows[0]['a']);
    same('नमस्ते', $rows[0]['b']);
    same("'=1+1", $rows[1]['a'], 'formula prefixed');
    same("'+91 98", $rows[1]['b']);
    rmTree($dir);
});

test('rate limiter counts per visitor and bucket', function () {
    $dir = tempDir();
    $limiter = new RateLimiter($dir);
    same(true, $limiter->allow('x', 'ip1', 2, 60));
    same(true, $limiter->allow('x', 'ip1', 2, 60));
    same(false, $limiter->allow('x', 'ip1', 2, 60), 'third hit refused');
    same(true, $limiter->allow('x', 'ip2', 2, 60), 'another visitor');
    same(true, $limiter->allow('y', 'ip1', 2, 60), 'another bucket');
    rmTree($dir);
});

/* ---------------- contact form ---------------- */
test('contact: a valid message is kept in the ledger and mailed to the ashram', function () use ($contact) {
    [$app, $dir] = makeApp();
    $r = call($app, 'POST', '/contact', $contact);
    same(201, $r->status);
    same('received', $r->body['status']);
    $rows = readCsvFile($dir . '/ledger/contact-submissions.csv');
    same(1, count($rows));
    same('Asha Verma', $rows[0]['name']);
    same('2026-11-04', $rows[0]['date'], 'local date');
    same('16:12:15', $rows[0]['time'], 'local time');
    same('2026-11-04T10:42:15Z', $rows[0]['received_utc']);
    same('sent', $rows[0]['mail_status']);
    $mail = mails($dir);
    same(1, count($mail));
    yes(str_contains($mail[0], "To: to@example.org\n"), 'recipient comes from the settings');
    yes(str_contains($mail[0], 'Reply-To: Asha Verma <asha@example.com>'), 'reply goes to the visitor');
    yes(str_contains($mail[0], 'with two children'), 'message in the mail');
    rmTree($dir);
});

test('contact: the Retreat channel goes to the Retreat address, and the form cannot choose a recipient', function () use ($contact) {
    [$app, $dir] = makeApp();
    call($app, 'POST', '/contact', ['channel' => 'retreat', 'to' => 'evil@example.com'] + $contact);
    $mail = mails($dir);
    yes(str_contains($mail[0], "To: retreat@example.org\n"), 'retreat recipient');
    yes(!str_contains($mail[0], 'evil@example.com'), 'a submitted address is ignored');
    rmTree($dir);
});

test('contact: invalid input is explained and nothing is kept', function () use ($contact) {
    [$app, $dir] = makeApp();
    $r = call($app, 'POST', '/contact', ['name' => '', 'email' => 'nope', 'message' => 'short', 'phone' => 'abc', 'age' => '3', 'arrival' => '2027-02-30'] + $contact);
    same(422, $r->status);
    same(['name', 'email', 'phone', 'age', 'arrival', 'message'], array_keys($r->body['errors']));
    yes(!file_exists($dir . '/ledger/contact-submissions.csv'), 'no ledger row');
    same([], mails($dir));
    rmTree($dir);
});

test('contact: bots (filled trap field, answered too fast) get a quiet success and nothing is kept', function () use ($contact) {
    [$app, $dir] = makeApp(['CONTACT_MIN_FILL_MS' => '3000']);
    same(201, call($app, 'POST', '/contact', ['website' => 'http://spam.example'] + $contact)->status);
    same(201, call($app, 'POST', '/contact', ['elapsed' => 400] + $contact)->status);
    yes(!file_exists($dir . '/ledger/contact-submissions.csv'), 'no ledger row');
    same([], mails($dir));
    rmTree($dir);
});

test('contact: too many messages from one address are refused', function () use ($contact) {
    [$app, $dir] = makeApp(['CONTACT_RATE_LIMIT' => '2']);
    same(201, call($app, 'POST', '/contact', $contact)->status);
    same(201, call($app, 'POST', '/contact', $contact)->status);
    same(429, call($app, 'POST', '/contact', $contact)->status);
    same(201, call($app, 'POST', '/contact', $contact, [], [], null, '203.0.113.99')->status, 'another address');
    rmTree($dir);
});

test('contact: header injection and spreadsheet formulas are neutralised', function () use ($contact) {
    [$app, $dir] = makeApp();
    call($app, 'POST', '/contact', ['name' => "Eve\r\nBcc: evil@example.com", 'subject' => "Hi\nBcc: x@example.com", 'message' => '=HYPERLINK("http://evil.example","click")'] + $contact);
    $mail = mails($dir)[0];
    $headers = explode("\n\n", $mail)[0];
    yes(!preg_match('/^Bcc:/mi', $headers), 'no Bcc header injected: ' . $headers);
    $rows = readCsvFile($dir . '/ledger/contact-submissions.csv');
    yes(str_starts_with($rows[0]['message'], "'="), 'formula prefixed in the ledger');
    yes(!str_contains($rows[0]['name'], "\n"), 'name is one line');
    rmTree($dir);
});

test('contact: a failed mail is still recorded; with the ledger also failing the visitor is told', function () use ($contact) {
    $dir = tempDir();
    $config = new Config(['CONTACT_TO' => 'to@example.org', 'CONTACT_MIN_FILL_MS' => '0', 'CONTACT_RATE_LIMIT' => '100'], dirname(__DIR__));
    $failing = new class implements MailTransport {
        public function send(MailMessage $message): void
        {
            throw new MailException('smtp down');
        }
    };
    $clock = new Clock(new DateTimeZone('UTC'));
    $make = fn (string $ledgerFile) => new ContactService($config, new CsvLedger($ledgerFile, ContactService::COLUMNS), $failing, new RateLimiter($dir . '/rl'), $clock);
    $old = ini_set('error_log', $dir . '/php.log');

    $r = $make($dir . '/ok.csv')->submit(new Request('POST', '/contact', [], [], json_encode($contact)));
    same(201, $r->status);
    same('failed', readCsvFile($dir . '/ok.csv')[0]['mail_status']);

    file_put_contents($dir . '/afile', 'x');
    $e = throws(fn () => $make($dir . '/afile/inside.csv')->submit(new Request('POST', '/contact', [], [], json_encode($contact))), Anamay\HttpError::class, 'both copies failing');
    same(500, $e->status);
    ini_set('error_log', (string) $old);
    rmTree($dir);
});

test('http: CORS, preflight, unknown routes and bad JSON', function () use ($contact) {
    [$app, $dir] = makeApp();
    $ok = call($app, 'POST', '/contact', $contact, ['Origin' => 'https://site.example']);
    same('https://site.example', $ok->headers['Access-Control-Allow-Origin'] ?? null);
    same(403, call($app, 'POST', '/contact', $contact, ['Origin' => 'https://evil.example'])->status, 'other website');
    $pre = call($app, 'OPTIONS', '/contact', null, ['Origin' => 'https://site.example']);
    same(204, $pre->status);
    yes(str_contains($pre->headers['Access-Control-Allow-Headers'] ?? '', 'Content-Type'), 'preflight headers');
    same(201, call($app, 'POST', '/contact', $contact)->status, 'no Origin header (server to server)');
    same(404, call($app, 'GET', '/nope')->status);
    same(400, call($app, 'POST', '/contact', null, [], [], '{not json')->status);
    same(['status' => 'ok'], call($app, 'GET', '/health')->body);
    rmTree($dir);
});

/* ---------------- donations ---------------- */
test('donations: the browser config lists the fields and amounts and no secret', function () {
    [$app, $dir] = makeApp(['DONATION_PRESETS' => '250, 750']);
    $r = call($app, 'GET', '/donations/config');
    same(200, $r->status);
    same([250, 750], $r->body['presets']);
    same(100, $r->body['minAmount']);
    same(['name', 'email', 'phone', 'address', 'city', 'state', 'pincode', 'pan'], array_column($r->body['fields'], 'name'));
    same('rzp_test_fake', $r->body['checkout']['keyId']);
    $json = json_encode($r->body);
    yes(!str_contains($json, FakeProvider::KEY_SECRET) && !str_contains($json, FakeProvider::WEBHOOK_SECRET), 'no secrets in the config');
    yes(!str_contains($json, 'validate'), 'server-side rules are not exposed');
    rmTree($dir);
});

test('donations: switched off without a provider', function () {
    [$app, $dir] = makeApp(['DONATION_PROVIDER' => '']);
    same(503, call($app, 'GET', '/donations/config')->status);
    same(503, call($app, 'POST', '/donations/orders', [])->status);
    rmTree($dir);
});

test('donations: an order is created and logged without PAN, address or phone', function () use ($donor) {
    [$app, $dir] = makeApp();
    $r = call($app, 'POST', '/donations/orders', ['amount' => 500, 'donor' => $donor]);
    same(201, $r->status);
    same(50000, $r->body['amount'], 'paise');
    same('INR', $r->body['currency']);
    yes(str_starts_with($r->body['orderId'], 'order_'), 'order id');
    $raw = file_get_contents($dir . '/ledger/donations.csv');
    yes(str_contains($raw, 'created') && str_contains($raw, '500.00') && str_contains($raw, 'ravi@example.com'), 'order row');
    foreach (['ABCDE1234F', '12 Park Road', '9876543210', '263139'] as $private) {
        yes(!str_contains($raw, $private), "{$private} must not be in the ledger");
    }
    same('created', call($app, 'GET', '/donations/status', null, [], ['order' => $r->body['orderId']])->body['status']);
    rmTree($dir);
});

test('donations: bad amounts and donor details are explained', function () use ($donor) {
    [$app, $dir] = makeApp();
    foreach ([50, 600000, '12.5', 'abc', null] as $amount) {
        $r = call($app, 'POST', '/donations/orders', ['amount' => $amount, 'donor' => $donor]);
        same(422, $r->status, 'amount ' . var_export($amount, true));
        same(['amount'], array_keys($r->body['errors']));
    }
    $r = call($app, 'POST', '/donations/orders', ['amount' => 500, 'donor' => ['pan' => '123', 'pincode' => '12', 'email' => 'x', 'phone' => '1'] + $donor]);
    same(422, $r->status);
    same(['email', 'phone', 'pincode', 'pan'], array_keys($r->body['errors']));
    same(422, call($app, 'POST', '/donations/orders', ['amount' => 500])->status, 'no donor at all');
    yes(!file_exists($dir . '/ledger/donations.csv'), 'nothing logged for invalid orders');
    rmTree($dir);
});

test('donations: orders per visitor are limited', function () use ($donor) {
    [$app, $dir] = makeApp(['DONATION_RATE_LIMIT' => '1']);
    same(201, call($app, 'POST', '/donations/orders', ['amount' => 500, 'donor' => $donor])->status);
    same(429, call($app, 'POST', '/donations/orders', ['amount' => 500, 'donor' => $donor])->status);
    rmTree($dir);
});

test('donations: the checkout signature decides, not the browser', function () use ($newOrder, $sign) {
    [$app, $dir] = makeApp();
    $order = $newOrder($app);
    $bad = call($app, 'POST', '/donations/verify', ['orderId' => $order, 'paymentId' => 'pay_ABC123456', 'signature' => str_repeat('a', 64)]);
    same(400, $bad->status);
    same('unverified', $bad->body['error']);
    same('created', call($app, 'GET', '/donations/status', null, [], ['order' => $order])->body['status'], 'a bad signature changes nothing');
    same(400, call($app, 'POST', '/donations/verify', ['orderId' => $order, 'paymentId' => "pay_x'; DROP", 'signature' => 'zz'])->status, 'malformed ids');
    same(404, call($app, 'POST', '/donations/verify', ['orderId' => 'order_unknown123', 'paymentId' => 'pay_ABC123456', 'signature' => $sign('order_unknown123', 'pay_ABC123456')])->status, 'an order we never made');
    $good = call($app, 'POST', '/donations/verify', ['orderId' => $order, 'paymentId' => 'pay_ABC123456', 'signature' => $sign($order, 'pay_ABC123456')]);
    same(200, $good->status);
    same('paid', $good->body['status']);
    same('paid', call($app, 'GET', '/donations/status', null, [], ['order' => $order])->body['status']);
    $other = call($app, 'POST', '/donations/verify', ['orderId' => $order, 'paymentId' => 'pay_OTHER12345', 'signature' => $sign($order, 'pay_ABC123456')]);
    same(400, $other->status, 'a signature for another payment');
    rmTree($dir);
});

test('donations: closing the checkout is noted, but never undoes a payment', function () use ($newOrder, $sign) {
    [$app, $dir] = makeApp();
    $a = $newOrder($app);
    same('cancelled', call($app, 'POST', '/donations/cancel', ['orderId' => $a])->body['status']);
    $b = $newOrder($app);
    call($app, 'POST', '/donations/verify', ['orderId' => $b, 'paymentId' => 'pay_ABC123456', 'signature' => $sign($b, 'pay_ABC123456')]);
    same('paid', call($app, 'POST', '/donations/cancel', ['orderId' => $b])->body['status']);
    same(404, call($app, 'GET', '/donations/status', null, [], ['order' => 'order_neverseen1'])->status);
    rmTree($dir);
});

test('donations: webhooks are signed, repeatable and keep a paid order paid', function () use ($newOrder, $webhook) {
    [$app, $dir] = makeApp();
    $order = $newOrder($app);
    same(400, $webhook($app, 'payment.captured', $order, 'evt_1', 'wrong-secret')->status, 'wrong signature');
    same('created', call($app, 'GET', '/donations/status', null, [], ['order' => $order])->body['status']);
    same(200, $webhook($app, 'payment.authorized', $order, 'evt_2')->status);
    same('pending', call($app, 'GET', '/donations/status', null, [], ['order' => $order])->body['status']);
    same(200, $webhook($app, 'payment.captured', $order, 'evt_3')->status);
    same('paid', call($app, 'GET', '/donations/status', null, [], ['order' => $order])->body['status']);
    $rowsBefore = count(readCsvFile($dir . '/ledger/donations.csv'));
    same(true, $webhook($app, 'payment.captured', $order, 'evt_3')->body['duplicate'] ?? false, 'the same delivery twice');
    same($rowsBefore, count(readCsvFile($dir . '/ledger/donations.csv')), 'no extra row');
    $webhook($app, 'payment.failed', $order, 'evt_4');
    same('paid', call($app, 'GET', '/donations/status', null, [], ['order' => $order])->body['status'], 'a late failed attempt does not undo a payment');
    same(true, $webhook($app, 'refund.created', $order, 'evt_5')->body['ignored'] ?? false, 'events we do not track');
    rmTree($dir);
});

test('donations: payments made elsewhere (the old payment button) are logged and marked', function () use ($webhook) {
    [$app, $dir] = makeApp();
    same(200, $webhook($app, 'payment.captured', 'order_FromButton01', 'evt_btn', null, 250000)->status);
    $row = readCsvFile($dir . '/ledger/donations.csv')[0];
    same('paid', $row['status']);
    same('2500.00', $row['amount']);
    yes(str_contains($row['note'], 'not created on this website'), 'marked');
    rmTree($dir);
});

test('razorpay provider: signatures follow the documented HMAC-SHA256 scheme (vectors computed with Node, not PHP)', function () {
    $body = '{"event":"payment.authorized","payload":{"payment":{"entity":{"id":"pay_JTVtDcN1uRYb5n","order_id":"order_JTVsulofMPyzBY","amount":22345,"currency":"INR"}}}}';
    $provider = new RazorpayProvider('rzp_test_x', 'key-secret', 'test');
    $event = $provider->parseWebhook($body, ['x-razorpay-signature' => '5e6c9a8f5db60a5839e54e272d86c094b32e2b17a69336b3113df181a4cf4db6']);
    same('pending', $event['type']);
    same('order_JTVsulofMPyzBY', $event['orderId']);
    same('pay_JTVtDcN1uRYb5n', $event['paymentId']);
    same(22345, $event['amountMinor']);
    throws(fn () => $provider->parseWebhook($body . ' ', ['x-razorpay-signature' => '5e6c9a8f5db60a5839e54e272d86c094b32e2b17a69336b3113df181a4cf4db6']), InvalidWebhook::class, 'a body changed after signing');
    throws(fn () => $provider->parseWebhook($body, ['x-razorpay-signature' => str_repeat('0', 64)]), InvalidWebhook::class, 'a wrong signature');
    throws(fn () => $provider->parseWebhook($body, []), InvalidWebhook::class, 'a missing signature');
    throws(fn () => (new RazorpayProvider('rzp_test_x', 'k', ''))->parseWebhook($body, ['x-razorpay-signature' => 'x']), InvalidWebhook::class, 'no webhook secret set');
    same(true, $provider->verifyPayment('order_A1', 'pay_B2', 'e93b41e36fd3ac8ea07b030cb5d419265131f557b2f568c6e6413e676ccd6c58'));
    same(false, $provider->verifyPayment('order_A1', 'pay_B2', str_repeat('0', 64)), 'a wrong checkout signature');
    same(false, $provider->verifyPayment('order_A2', 'pay_B2', 'e93b41e36fd3ac8ea07b030cb5d419265131f557b2f568c6e6413e676ccd6c58'), 'a signature of another order');
});

test('wiring: production refuses development settings and mismatched Razorpay keys', function () {
    foreach ([['MAIL_TRANSPORT' => 'log', 'path' => '/contact'], ['DONATION_PROVIDER' => 'fake', 'path' => '/donations/config'], ['DONATION_PROVIDER' => 'razorpay', 'RAZORPAY_KEY_ID' => 'rzp_test_abc', 'RAZORPAY_KEY_SECRET' => 's', 'path' => '/donations/config']] as $case) {
        $path = $case['path'];
        unset($case['path']);
        [$app, $dir] = makeApp(['APP_ENV' => 'production', 'CONTACT_MIN_FILL_MS' => '0'] + $case);
        $old = ini_set('error_log', $dir . '/php.log');
        $r = call($app, $path === '/contact' ? 'POST' : 'GET', $path, $path === '/contact' ? ['name' => 'A', 'email' => 'a@example.com', 'message' => 'a long enough message', 'elapsed' => 9999] : null);
        ini_set('error_log', (string) $old);
        same(500, $r->status, json_encode($case));
        same(['error' => 'server_error'], $r->body, 'no internals in the answer');
        rmTree($dir);
    }
    [$app, $dir] = makeApp(['APP_ENV' => 'testing', 'DONATION_PROVIDER' => 'razorpay', 'RAZORPAY_KEY_ID' => 'rzp_test_abc', 'RAZORPAY_KEY_SECRET' => 's']);
    same('rzp_test_abc', call($app, 'GET', '/donations/config')->body['checkout']['keyId'], 'a test key outside production');
    rmTree($dir);
});

/* ---------------- run ---------------- */
$failed = 0;
foreach ($tests as $name => $fn) {
    try {
        $fn();
        echo "  ok   {$name}\n";
    } catch (Throwable $e) {
        $failed++;
        echo "  FAIL {$name}\n       " . $e->getMessage() . "\n       at " . basename($e->getFile()) . ':' . $e->getLine() . "\n";
    }
}
echo "\n" . (count($tests) - $failed) . ' of ' . count($tests) . " passed\n";
exit($failed === 0 ? 0 : 1);
