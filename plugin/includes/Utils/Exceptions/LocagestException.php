<?php

declare(strict_types=1);

namespace Locagest\Utils\Exceptions;

class LocagestException extends \RuntimeException {

    public function __construct( string $message, private readonly int $httpStatus = 500 ) {
        parent::__construct( $message );
    }

    public function getHttpStatus(): int {
        return $this->httpStatus;
    }
}
