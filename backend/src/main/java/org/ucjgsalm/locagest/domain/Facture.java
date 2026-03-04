package org.ucjgsalm.locagest.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.ucjgsalm.locagest.domain.enums.StatutFacture;

public record Facture(
    UUID           id,
    UUID           sejourId,
    String         numero,              // FAC-2025-042
    OffsetDateTime dateGeneration,
    BigDecimal     montantHebergement,
    BigDecimal     montantEnergie,
    BigDecimal     montantTaxe,
    BigDecimal     montantSupplements,
    BigDecimal     montantTotal,
    StatutFacture  statut,
    String         pdfS3Key,
    boolean        emailEnvoye,
    OffsetDateTime emailEnvoyeAt
) {}
