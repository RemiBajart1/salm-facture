<?php

declare(strict_types=1);

namespace Locagest\Domain\Enums;

enum StatutFacture: string {
    case BROUILLON = 'BROUILLON';
    case EMISE     = 'EMISE';
    case PAYEE     = 'PAYEE';
}
