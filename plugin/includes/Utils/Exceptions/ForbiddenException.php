<?php

declare(strict_types=1);

namespace Locagest\Utils\Exceptions;

class ForbiddenException extends LocagestException {
    public function __construct( string $message = 'Accès refusé.' ) {
        parent::__construct( $message, 403 );
    }
}
