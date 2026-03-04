package org.ucjgsalm.locagest.domain;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.ucjgsalm.locagest.domain.enums.*;

/** Séjour — entité centrale. nb_nuits est calculé par PostgreSQL (GENERATED ALWAYS). */
public record Sejour(
    UUID            id,
    UUID            locataireId,
    StatutSejour    statut,
    LocalDate       dateArrivee,
    LocalDate       dateDepart,
    int             nbNuits,           // GENERATED côté BDD
    LocalTime       heureArriveePrevue,
    LocalTime       heureDepartPrevu,
    LocalTime       heureArriveeReelle,
    LocalTime       heureDepartReel,
    Integer         nbAdultes,
    int             minPersonnesTotal,
    ModePaiement    modePaiement,
    LocalDate       dateLimitePaiement,
    String          optionsPresaisies,
    String          notesInternes,
    String          createdBy,
    String          updatedBy,
    OffsetDateTime  createdAt,
    OffsetDateTime  updatedAt
) {}
