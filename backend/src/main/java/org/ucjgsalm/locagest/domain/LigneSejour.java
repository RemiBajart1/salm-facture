package org.ucjgsalm.locagest.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.ucjgsalm.locagest.domain.enums.*;

/**
 * Ligne individuelle d'une facture.
 *
 * type_ligne == HEBERGEMENT : une seule ligne "Forfait N personnes · M nuits",
 *   quantite=1, prix_unitaire = montant total hébergement calculé.
 *
 * type_ligne == LIBRE : saisie libre par le gardien.
 *   Peut être promue en SUPPLEMENT via ConfigItemService.promouvoirLigneLibre().
 *   montant est GENERATED par PostgreSQL (quantite × prix_unitaire).
 */
public record LigneSejour(
    UUID           id,
    UUID           sejourId,
    UUID           configItemId,    // non-null si type == SUPPLEMENT après promotion
    TypeLigne      typeLigne,
    String         designation,
    BigDecimal     quantite,
    BigDecimal     prixUnitaire,
    BigDecimal     montant,         // GENERATED ALWAYS (lu en DB, pas écrit)
    StatutLigne    statut,
    String         saisiPar,
    OffsetDateTime createdAt
) {}
