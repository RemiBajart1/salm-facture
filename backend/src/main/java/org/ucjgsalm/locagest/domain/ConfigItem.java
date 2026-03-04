package org.ucjgsalm.locagest.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.ucjgsalm.locagest.domain.enums.*;

public record ConfigItem(
    UUID          id,
    String        designation,
    CategorieItem categorie,
    BigDecimal    prixUnitaire,
    UniteItem     unite,
    boolean       actif,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
