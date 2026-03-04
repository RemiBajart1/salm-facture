package org.ucjgsalm.locagest.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.ucjgsalm.locagest.domain.enums.*;

public record TarifPersonne(
    UUID           id,
    String         nom,
    BigDecimal     prixNuit,
    String         description,
    boolean        actif,
    int            ordre,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    String         updatedBy
) {}

