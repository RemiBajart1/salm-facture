package org.ucjgsalm.locagest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class Dtos {
    private Dtos() {}

// ═════════════════════════════════════════════════════════════════════════════
// SÉJOUR
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record CreerSejourRequest(
    // Locataire (créé ou retrouvé par email)
    @NotBlank  String nomLocataire,
    @NotBlank @Email String emailLocataire,
    String telephoneLocataire,
    String adresseLocataire,

    // Séjour
    @NotNull LocalDate dateArrivee,
    @NotNull LocalDate dateDepart,
    LocalTime heureArriveePrevue,
    LocalTime heureDepartPrevu,
    String    modePaiement,
    String    optionsPresaisies,
    String    notesInternes,

    // Catégories : liste des tarifs sélectionnés avec effectif prévu
    @NotEmpty List<CategorieSpec> categories,
    Integer   minPersonnesTotal   // null = utilise config_site.min_personnes_defaut
) {}

@Serdeable
public record CategorieSpec(
    @NotNull UUID tarifId,
    @NotNull @Min(0) Integer nbPrevues
) {}

@Serdeable
public record SejourResponse(
    UUID       id,
    String     statut,
    LocalDate  dateArrivee,
    LocalDate  dateDepart,
    int        nbNuits,
    LocalTime  heureArriveePrevue,
    LocalTime  heureDepartPrevu,
    LocalTime  heureArriveeReelle,
    LocalTime  heureDepartReel,
    Integer    nbAdultes,
    int        minPersonnesTotal,
    String     modePaiement,
    LocalDate  dateLimitePaiement,
    String     optionsPresaisies,
    String     notesInternes,
    // Locataire inline
    String     nomLocataire,
    String     emailLocataire,
    String     telephoneLocataire,
    // Catégories
    List<SejourCategorieResponse> categories
) {}

@Serdeable
public record SejourCategorieResponse(
    UUID       id,
    String     nom,
    BigDecimal prixNuit,
    Integer    nbPrevues,
    Integer    nbReelles
) {}

// ═════════════════════════════════════════════════════════════════════════════
// SAISIE GARDIEN
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record SaisiePersonnesRequest(
    @NotEmpty List<SaisieCategorieItem> categories,
    @NotNull @Min(0) Integer nbAdultes
) {}

@Serdeable
public record SaisieCategorieItem(
    @NotNull UUID    categorieId,
    @NotNull @Min(0) Integer nbReelles
) {}

@Serdeable
public record SaisieHorairesRequest(
    LocalTime heureArriveeReelle,
    LocalTime heureDepartReel
) {}

// ═════════════════════════════════════════════════════════════════════════════
// LIGNES SÉJOUR (suppléments)
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record AjouterSupplementRequest(
    UUID       configItemId,   // null si saisie libre
    @NotBlank  String designation,
    @NotNull @DecimalMin("0.01") BigDecimal quantite,
    @NotNull @DecimalMin("0.00") BigDecimal prixUnitaire
) {}

@Serdeable
public record LigneSejourResponse(
    UUID       id,
    String     typeLigne,
    String     designation,
    BigDecimal quantite,
    BigDecimal prixUnitaire,
    BigDecimal montant,
    String     statut,
    String     saisiPar,
    OffsetDateTime createdAt
) {}

// ═════════════════════════════════════════════════════════════════════════════
// PROMOTION LIBRE → CATALOGUE
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record PromouvoirLigneRequest(
    @NotBlank String    categorieItem,  // CASSE | LOCATION | SERVICE
    @NotBlank String    unite,          // UNITE | SEJOUR | INTERVENTION
    String              nomCatalogue    // si null → utilise la désignation de la ligne
) {}

// ═════════════════════════════════════════════════════════════════════════════
// FACTURE
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record FactureResponse(
    UUID       id,
    UUID       sejourId,
    String     numero,
    OffsetDateTime dateGeneration,
    BigDecimal montantHebergement,
    BigDecimal montantEnergie,
    BigDecimal montantTaxe,
    BigDecimal montantSupplements,
    BigDecimal montantTotal,
    String     statut,
    boolean    emailEnvoye,
    String     pdfUrl    // URL présignée S3, générée à la demande
) {}

@Serdeable
public record GenererFactureRequest(
    boolean envoyer   // true = génère + envoie immédiatement par email
) {}

// ═════════════════════════════════════════════════════════════════════════════
// PAIEMENT
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record EnregistrerPaiementRequest(
    @NotBlank String    mode,          // CHEQUE | VIREMENT
    @NotNull  BigDecimal montant,
    LocalDate           dateEncaissement,
    String              numeroCheque,
    String              banqueEmettrice
    // photo : envoyée en multipart séparément
) {}

@Serdeable
public record PaiementResponse(
    UUID       id,
    String     mode,
    BigDecimal montant,
    LocalDate  dateEncaissement,
    String     numeroCheque,
    String     banqueEmettrice,
    String     chequePhotoUrl,   // URL présignée, null si pas de photo
    String     enregistrePar,
    OffsetDateTime createdAt
) {}

// ═════════════════════════════════════════════════════════════════════════════
// TARIFS & CONFIGURATION (Trésorier)
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record TarifPersonneRequest(
    @NotBlank String    nom,
    @NotNull @DecimalMin("0.00") BigDecimal prixNuit,
    String              description,
    boolean             actif,
    int                 ordre
) {}

@Serdeable
public record TarifPersonneResponse(
    UUID       id,
    String     nom,
    BigDecimal prixNuit,
    String     description,
    boolean    actif,
    int        ordre
) {}

@Serdeable
public record ConfigItemRequest(
    @NotBlank String    designation,
    @NotBlank String    categorie,    // CASSE | LOCATION | SERVICE
    @NotNull @DecimalMin("0.00") BigDecimal prixUnitaire,
    @NotBlank String    unite,        // UNITE | SEJOUR | INTERVENTION
    boolean             actif
) {}

@Serdeable
public record ConfigItemResponse(
    UUID       id,
    String     designation,
    String     categorie,
    BigDecimal prixUnitaire,
    String     unite,
    boolean    actif
) {}

@Serdeable
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConfigSiteRequest(
    Map<String, String> valeurs   // { "energie_prix_nuit": "80.00", ... }
) {}

// ═════════════════════════════════════════════════════════════════════════════
// LOCATAIRE
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record LocataireResponse(
    UUID           id,
    String         nom,
    String         email,
    String         telephone,
    String         adresse,
    OffsetDateTime createdAt
) {}

// ═════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record PagedResponse<T>(
    List<T> content,
    int     page,
    int     size,
    long    totalElements,
    int     totalPages
) {}

// ═════════════════════════════════════════════════════════════════════════════
// ERREURS
// ═════════════════════════════════════════════════════════════════════════════

@Serdeable
public record ErrorResponse(String code, String message) {}

} // end class Dtos
