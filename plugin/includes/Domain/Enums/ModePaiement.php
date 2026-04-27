<?php

declare(strict_types=1);

namespace Locagest\Domain\Enums;

enum ModePaiement: string {
    case CHEQUE   = 'CHEQUE';
    case VIREMENT = 'VIREMENT';
    case ESPECES  = 'ESPECES';
}
