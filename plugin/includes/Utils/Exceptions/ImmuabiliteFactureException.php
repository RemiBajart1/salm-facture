<?php

declare(strict_types=1);

namespace Locagest\Utils\Exceptions;

/**
 * Levée lorsqu'on tente de modifier une facture EMISE ou PAYEE.
 * → 409 CONFLICT
 */
class ImmuabiliteFactureException extends LocagestException {
    public function __construct( string $numero ) {
        parent::__construct( "La facture $numero est figée (EMISE ou PAYEE) et ne peut pas être recalculée.", 409 );
    }
}
