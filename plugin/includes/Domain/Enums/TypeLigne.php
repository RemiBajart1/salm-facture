<?php

declare(strict_types=1);

namespace Locagest\Domain\Enums;

enum TypeLigne: string {
    case HEBERGEMENT = 'HEBERGEMENT';
    case ENERGIE     = 'ENERGIE';
    case TAXE        = 'TAXE';
    case SUPPLEMENT  = 'SUPPLEMENT';
    case LIBRE       = 'LIBRE';
}
