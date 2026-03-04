package org.ucjgsalm.locagest.service;

import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.*;

/**
 * Gestion des séjours : création avec snapshot des catégories, saisie des effectifs réels.
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
public class SejourService {

    private final SejourRepository          sejourRepo;
    private final SejourCategorieRepository catRepo;
    private final TarifPersonneRepository   tarifRepo;
    private final ConfigSiteRepository      config;

    /** Spec de catégorie utilisée à la création d'un séjour (interne au service). */
    public record CategorieSpec(UUID tarifId, int nbPrevues) {}

    /** Saisie gardien : nb réels pour une catégorie. */
    public record SaisieCategorie(UUID categorieId, int nbReelles) {}

    /**
     * Crée un séjour avec ses catégories de tarifs.
     * Les prix sont copiés (snapshot) depuis {@code tarif_personne} au moment de l'appel.
     * Les modifications ultérieures des tarifs n'affecteront pas ce séjour.
     */
    public Sejour creer(Sejour sejour, List<CategorieSpec> categoriesSpec) throws Exception {
        log.info("Création séjour du {} au {} (locataire={})", sejour.dateArrivee(), sejour.dateDepart(), sejour.locataireId());

        Sejour aInserer = sejour;

        if (sejour.dateLimitePaiement() == null && sejour.modePaiement() == ModePaiement.VIREMENT) {
            int delai = config.getInt("delai_paiement_jours");
            aInserer = withDateLimitePaiement(sejour, sejour.dateDepart().plusDays(delai));
            log.debug("Date limite paiement calculée : {}", aInserer.dateLimitePaiement());
        }

        int minDefaut = config.getInt("min_personnes_defaut");
        if (aInserer.minPersonnesTotal() == 0) {
            aInserer = withMinPersonnes(aInserer, minDefaut);
            log.debug("min_personnes_total initialisé à {} (valeur par défaut)", minDefaut);
        }

        var sejourCree = sejourRepo.insert(aInserer);
        log.debug("Séjour inséré id={}", sejourCree.id());

        int ordre = 0;
        for (var spec : categoriesSpec) {
            var tarif = tarifRepo.findById(spec.tarifId())
                .orElseThrow(() -> new NoSuchElementException("Tarif " + spec.tarifId() + " introuvable"));

            if (!tarif.actif()) {
                throw new IllegalArgumentException("Tarif " + tarif.nom() + " inactif");
            }

            catRepo.insert(new SejourCategorie(
                UUID.randomUUID(),
                sejourCree.id(),
                tarif.id(),
                tarif.nom(),
                tarif.prixNuit(),
                spec.nbPrevues(),
                null,
                ordre++
            ));
            log.debug("Catégorie '{}' ({}€/nuit, {} prévus) snapshotée", tarif.nom(), tarif.prixNuit(), spec.nbPrevues());
        }

        return sejourCree;
    }

    /**
     * Enregistre les effectifs réels par catégorie et le nombre d'adultes.
     * Passe le séjour en statut EN_COURS.
     */
    public void saisirPersonnes(UUID sejourId,
                                List<SaisieCategorie> saisies,
                                int nbAdultes,
                                String gardienId) throws Exception {
        sejourRepo.findById(sejourId)
            .orElseThrow(() -> new NoSuchElementException("Séjour " + sejourId + " introuvable"));

        for (var s : saisies) {
            if (s.nbReelles() < 0) throw new IllegalArgumentException("nb_reelles ne peut pas être négatif");
            catRepo.updateNbReelles(s.categorieId(), sejourId, s.nbReelles());
        }

        sejourRepo.updateNbAdultes(sejourId, nbAdultes, gardienId);
        sejourRepo.updateStatut(sejourId, StatutSejour.EN_COURS, gardienId);
        log.info("Saisie personnes séjour={} : {} adultes, {} catégories saisies par {}", sejourId, nbAdultes, saisies.size(), gardienId);
    }

    /**
     * Enregistre les horaires réels d'arrivée et de départ saisis par le gardien.
     * Passe automatiquement le séjour en EN_COURS s'il était PLANIFIE.
     */
    public void updateHorairesReels(UUID sejourId,
                                    java.time.LocalTime arrivee,
                                    java.time.LocalTime depart,
                                    String userId) throws Exception {
        sejourRepo.findById(sejourId)
            .orElseThrow(() -> new NoSuchElementException("Séjour " + sejourId + " introuvable"));
        sejourRepo.updateHorairesReels(sejourId, arrivee, depart, userId);
        log.info("Horaires réels mis à jour séjour={} arrivée={} départ={}", sejourId, arrivee, depart);
    }

    /** Retourne le séjour EN_COURS, ou le prochain PLANIFIE. */
    public Optional<Sejour> sejourEnCours() throws Exception {
        return sejourRepo.findCurrent();
    }

    /** Recherche un séjour par son identifiant. */
    public Optional<Sejour> findById(UUID id) throws Exception {
        return sejourRepo.findById(id);
    }

    /** Liste les séjours filtrés par statut. */
    public List<Sejour> listByStatut(StatutSejour statut) throws Exception {
        return sejourRepo.findByStatut(statut);
    }

    /** Retourne les catégories de tarifs d'un séjour. */
    public List<SejourCategorie> categories(UUID sejourId) throws Exception {
        return catRepo.findBySejourId(sejourId);
    }

    private Sejour withDateLimitePaiement(Sejour s, LocalDate date) {
        return new Sejour(s.id(), s.locataireId(), s.statut(), s.dateArrivee(), s.dateDepart(),
            s.nbNuits(), s.heureArriveePrevue(), s.heureDepartPrevu(),
            s.heureArriveeReelle(), s.heureDepartReel(),
            s.nbAdultes(), s.minPersonnesTotal(), s.modePaiement(), date,
            s.optionsPresaisies(), s.notesInternes(),
            s.createdBy(), s.updatedBy(), s.createdAt(), s.updatedAt());
    }

    private Sejour withMinPersonnes(Sejour s, int min) {
        return new Sejour(s.id(), s.locataireId(), s.statut(), s.dateArrivee(), s.dateDepart(),
            s.nbNuits(), s.heureArriveePrevue(), s.heureDepartPrevu(),
            s.heureArriveeReelle(), s.heureDepartReel(),
            s.nbAdultes(), min, s.modePaiement(), s.dateLimitePaiement(),
            s.optionsPresaisies(), s.notesInternes(),
            s.createdBy(), s.updatedBy(), s.createdAt(), s.updatedAt());
    }
}
