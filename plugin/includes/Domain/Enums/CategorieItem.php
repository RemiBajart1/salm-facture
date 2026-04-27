<?php

declare(strict_types=1);

namespace Locagest\Domain\Enums;

enum CategorieItem: string {
    case LOCATION    = 'LOCATION';
    case CASSE       = 'CASSE';
    case INTERVENTION = 'INTERVENTION';
}
