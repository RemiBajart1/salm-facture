<?php

declare(strict_types=1);

namespace Locagest\Utils\Exceptions;

class UnauthorizedException extends LocagestException {
    public function __construct( string $message = 'Authentification requise.' ) {
        parent::__construct( $message, 401 );
    }
}
