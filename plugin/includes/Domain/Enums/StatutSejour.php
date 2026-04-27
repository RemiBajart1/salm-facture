<?php

declare(strict_types=1);

namespace Locagest\Domain\Enums;

enum StatutSejour: string {
    case PLANIFIE  = 'PLANIFIE';
    case EN_COURS  = 'EN_COURS';
    case TERMINE   = 'TERMINE';
    case ANNULE    = 'ANNULE';
}
