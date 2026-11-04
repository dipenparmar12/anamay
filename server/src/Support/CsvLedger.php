<?php

declare(strict_types=1);

namespace Anamay\Support;

/**
 * An append-only CSV file. Rows are written under an exclusive lock, the header is written once, and the file
 * starts with a UTF-8 byte order mark so Excel shows Devanagari and accents correctly. Text that a spreadsheet
 * could run as a formula (starting with = + - @) is prefixed with an apostrophe.
 */
final class CsvLedger
{
    /** @param list<string> $columns */
    public function __construct(private string $path, private array $columns)
    {
    }

    /** @param array<string,scalar|null> $row */
    public function append(array $row): void
    {
        $dir = dirname($this->path);
        if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException('The ledger folder cannot be created.');
        }
        $file = fopen($this->path, 'ab');
        if ($file === false) {
            throw new \RuntimeException('The ledger file cannot be opened.');
        }
        try {
            if (!flock($file, LOCK_EX)) {
                throw new \RuntimeException('The ledger file cannot be locked.');
            }
            clearstatcache(true, $this->path);
            if ((int) (fstat($file)['size'] ?? 0) === 0) {
                fwrite($file, "\xEF\xBB\xBF");
                fputcsv($file, $this->columns, ',', '"', '', "\n");
            }
            $cells = array_map(fn (string $column): string => self::cell($row[$column] ?? ''), $this->columns);
            if (fputcsv($file, $cells, ',', '"', '', "\n") === false) {
                throw new \RuntimeException('The ledger row cannot be written.');
            }
            fflush($file);
            flock($file, LOCK_UN);
        } finally {
            fclose($file);
        }
    }

    public static function cell(mixed $value): string
    {
        $text = str_replace("\0", '', (string) $value);
        return $text !== '' && str_contains("=+-@\t\r", $text[0]) ? "'" . $text : $text;
    }

    /** @return \Generator<int,array<string,string>> */
    public function rows(): \Generator
    {
        if (!is_file($this->path)) {
            return;
        }
        $file = fopen($this->path, 'rb');
        if ($file === false) {
            return;
        }
        try {
            flock($file, LOCK_SH);
            if (fread($file, 3) !== "\xEF\xBB\xBF") {
                rewind($file);
            }
            $header = fgetcsv($file, 0, ',', '"', '');
            while (is_array($header) && ($row = fgetcsv($file, 0, ',', '"', '')) !== false) {
                if ($row === [null]) {
                    continue;
                }
                yield array_combine($header, array_pad(array_slice($row, 0, count($header)), count($header), ''));
            }
        } finally {
            flock($file, LOCK_UN);
            fclose($file);
        }
    }
}
