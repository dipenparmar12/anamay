<?php

declare(strict_types=1);

/**
 * Donation settings that are not secret. Amounts can also be set with DONATION_MIN_AMOUNT, DONATION_MAX_AMOUNT and
 * DONATION_PRESETS (comma-separated rupees) without editing this file.
 *
 * The fields mirror what the payment form on the old website asked for: name, email, mobile, address, city, state,
 * pincode and PAN. They are checked here, handed to the payment service with the order, and (except name and
 * email) not kept on this server.
 */
return [
    'merchantName' => 'Shree Anamay Nyas',
    'description' => 'Donation to Anāmay Ashram',
    'currency' => 'INR',
    'symbol' => '₹',
    'minAmount' => 100,
    'maxAmount' => 500000,
    'presets' => [500, 1100, 2100, 5100],
    'themeColor' => '#c2652a',
    'fields' => [
        ['name' => 'name', 'label' => 'Full name', 'type' => 'text', 'maxlength' => 100, 'autocomplete' => 'name',
            'validate' => '/^[\p{L}\p{M} .\'\-]{2,100}$/u', 'error' => 'Please enter your full name.'],
        ['name' => 'email', 'label' => 'Email', 'type' => 'email', 'maxlength' => 150, 'autocomplete' => 'email',
            'error' => 'Please enter a valid email.'],
        ['name' => 'phone', 'label' => 'Mobile number', 'type' => 'tel', 'maxlength' => 18, 'autocomplete' => 'tel',
            'validate' => '/^\+?[0-9 \-]{8,18}$/', 'pattern' => '\+?[0-9 \-]{8,18}', 'error' => 'Please check the mobile number.'],
        ['name' => 'address', 'label' => 'Address', 'type' => 'text', 'maxlength' => 200, 'autocomplete' => 'street-address',
            'validate' => '/^.{5,200}$/u', 'error' => 'Please enter your address.'],
        ['name' => 'city', 'label' => 'City', 'type' => 'text', 'maxlength' => 60, 'autocomplete' => 'address-level2',
            'validate' => '/^[\p{L}\p{M} .\'\-]{2,60}$/u', 'error' => 'Please enter your city.'],
        ['name' => 'state', 'label' => 'State', 'type' => 'text', 'maxlength' => 60, 'autocomplete' => 'address-level1',
            'validate' => '/^[\p{L}\p{M} .\'\-]{2,60}$/u', 'error' => 'Please enter your state.'],
        ['name' => 'pincode', 'label' => 'Pincode', 'type' => 'text', 'maxlength' => 6, 'autocomplete' => 'postal-code', 'inputmode' => 'numeric',
            'validate' => '/^[1-9][0-9]{5}$/', 'pattern' => '[1-9][0-9]{5}', 'error' => 'The pincode has six digits.'],
        ['name' => 'pan', 'label' => 'PAN number', 'type' => 'text', 'maxlength' => 10, 'uppercase' => true,
            'validate' => '/^[A-Z]{5}[0-9]{4}[A-Z]$/', 'pattern' => '[A-Za-z]{5}[0-9]{4}[A-Za-z]', 'error' => 'A PAN looks like ABCDE1234F.'],
    ],
];
