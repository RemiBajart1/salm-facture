package org.ucjgsalm.locagest.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Locataire(
    UUID           id,
    String         nom,
    String         email,
    String         telephone,
    String         adresse,
    OffsetDateTime createdAt
) {}
