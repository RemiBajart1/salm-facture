package org.ucjgsalm.locagest.domain;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Catégorie de personnes pour un séjour donné.
 * Les champs snapshot sont IMMUABLES après création (prix copiés du tarif au moment du séjour).
 */
public record SejourCategorie(
    UUID       id,
    UUID       sejourId,
    UUID       tarifId,          // peut être null si le tarif a été supprimé depuis
    String     nomSnapshot,      // copie — ne jamais re-lire tarif_personne pour calculer
    BigDecimal prixNuitSnapshot, // copie
    Integer    nbPrevues,        // saisi par resp. location
    Integer    nbReelles,        // saisi par le gardien
    int        ordre
) {
    /** Alias pour la lisibilité dans FactureCalculService. */
    public BigDecimal getPrixNuitSnapshot() { return prixNuitSnapshot; }
}
