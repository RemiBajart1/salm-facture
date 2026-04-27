<?php

declare(strict_types=1);

namespace Locagest\Utils\Exceptions;

class InvalidInputException extends LocagestException {
    public function __construct( string $message ) {
        parent::__construct( $message, 400 );
    }
}
