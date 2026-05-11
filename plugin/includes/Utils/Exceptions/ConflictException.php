<?php

declare(strict_types=1);

namespace Locagest\Utils\Exceptions;

class ConflictException extends LocagestException {
    public function __construct( string $message ) {
        parent::__construct( $message, 409 );
    }
}
