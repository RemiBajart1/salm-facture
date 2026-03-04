package org.ucjgsalm.locagest.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.ucjgsalm.locagest.domain.enums.ModePaiement;

public record Paiement(
    UUID         id,
    UUID         sejourId,
    ModePaiement mode,
    BigDecimal   montant,
    LocalDate    dateEncaissement,
    String       numeroCheque,
    String       banqueEmettrice,
    String       chequeS3Key,
    String       enregistrePar,
    OffsetDateTime createdAt
) {}
