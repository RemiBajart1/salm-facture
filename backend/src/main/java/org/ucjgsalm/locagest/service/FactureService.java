package org.ucjgsalm.locagest.service;

import jakarta.transaction.Transactional;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.time.Year;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.*;

/**
 * Orchestre la génération d'une facture :
 * <ol>
 *   <li>Calcul des montants ({@link FactureCalculService})</li>
 *   <li>Persistance des lignes + facture (transaction ACID)</li>
 *   <li>Génération PDF ({@link PdfService})</li>
 *   <li>Upload S3 ({@link S3Service})</li>
 *   <li>Envoi email SES ({@link EmailService})</li>
 * </ol>
 *
 * <p>Idempotence : si une facture BROUILLON existe déjà pour ce séjour, elle est recalculée.
 * Si elle est EMISE ou PAYEE, une erreur 409 est levée.
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
public class FactureService {

    private final SejourRepository           sejourRepo;
    private final SejourCategorieRepository  catRepo;
    private final LigneSejourRepository      ligneRepo;
    private final FactureRepository          factureRepo;
    private final LocataireRepository        locataireRepo;
    private final ConfigSiteRepository       config;
    private final FactureCalculService       calcul;
    private final PdfService                 pdf;
    private final S3Service                  s3;
    private final EmailService               email;

    /**
     * Génère (et optionnellement envoie) la facture d'un séjour.
     * L'ensemble du calcul + persistance est enveloppé dans une transaction ACID.
     *
     * @param sejourId  séjour à facturer
     * @param envoyer   {@code true} = génère + envoie le mail immédiatement
     * @param userId    identifiant Cognito de l'appelant
     * @throws IllegalStateException si la facture est déjà EMISE ou PAYEE
     */
    @Transactional
    public Facture generer(UUID sejourId, boolean envoyer, String userId) throws Exception {
        log.info("Génération facture pour séjour={} envoyer={}", sejourId, envoyer);

        var sejour = sejourRepo.findById(sejourId)
            .orElseThrow(() -> new NoSuchElementException("Séjour " + sejourId + " introuvable"));

        var existante = factureRepo.findBySejourId(sejourId);
        if (existante.isPresent() && existante.get().statut() != StatutFacture.BROUILLON) {
            throw new IllegalStateException(
                "Facture " + existante.get().numero() + " déjà émise — modification impossible");
        }

        var categories = catRepo.findBySejourId(sejourId);
        long nonSaisi = categories.stream().filter(c -> c.nbReelles() == null).count();
        if (nonSaisi > 0) {
            throw new IllegalStateException(
                nonSaisi + " catégorie(s) sans nb_reelles — saisie gardien incomplète");
        }

        var lignesExistantes = ligneRepo.findBySejourId(sejourId).stream()
            .filter(l -> l.typeLigne() == TypeLigne.SUPPLEMENT || l.typeLigne() == TypeLigne.LIBRE)
            .toList();

        var montants = calcul.calculer(sejour, categories, lignesExistantes);

        String numero = existante.map(Facture::numero)
            .orElseGet(() -> {
                try { return factureRepo.nextNumero(Year.now().getValue()); }
                catch (Exception e) { throw new RuntimeException(e); }
            });

        var ligneHeberg  = calcul.ligneHebergement(sejourId, montants, sejour.nbNuits());
        var ligneEnergie = calcul.ligneEnergie(sejourId, montants.energie(),
            sejour.nbNuits(), config.getInt("energie_nb_nuits"));
        var ligneTaxe    = calcul.ligneTaxe(sejourId, montants.taxe(),
            sejour.nbAdultes() != null ? sejour.nbAdultes() : 0, sejour.nbNuits());

        recalculerLignesCalculees(sejourId, ligneHeberg, ligneEnergie, ligneTaxe);

        var facture = persistFacture(existante, sejourId, numero, montants);
        log.info("Facture {} créée (total={}€)", facture.numero(), facture.montantTotal());

        sejourRepo.updateStatut(sejourId, StatutSejour.TERMINE, userId);

        if (envoyer) {
            envoyer(facture, sejour);
        }

        return facture;
    }

    /**
     * Envoie la facture par email (génère le PDF, upload S3, envoie SES).
     *
     * @param facture  facture à envoyer
     * @param sejour   séjour associé
     */
    public void envoyer(Facture facture, Sejour sejour) throws Exception {
        log.info("Envoi facture {} par email", facture.numero());

        var locataire = locataireRepo.findById(sejour.locataireId())
            .orElseThrow(() -> new NoSuchElementException(
                "Locataire " + sejour.locataireId() + " introuvable"));

        var toutes   = ligneRepo.findBySejourId(sejour.id());
        byte[] pdfBytes = pdf.generer(facture, sejour, toutes, config.getAll());
        String s3Key    = s3.uploadPdf(pdfBytes, facture.numero(), sejour.dateArrivee().getYear());
        factureRepo.updatePdfKey(facture.id(), s3Key);

        String emailResp = config.get("email_resp_location").orElse("");
        email.envoyerFacture(facture, sejour, locataire.email(), pdfBytes, emailResp);
        factureRepo.marquerEmailEnvoye(facture.id());
        log.info("Facture {} envoyée à {} (S3 key={})", facture.numero(), locataire.email(), s3Key);
    }

    /**
     * Renvoie la facture par email pour un séjour.
     * Réutilise le PDF existant en S3 si disponible, sinon le régénère et l'upload.
     *
     * @param sejourId identifiant du séjour
     * @param userId   identifiant Cognito de l'appelant
     * @throws NoSuchElementException si le séjour, la facture ou le locataire est introuvable
     * @throws IllegalStateException  si aucune facture n'existe pour ce séjour
     */
    public void renvoyer(UUID sejourId, String userId) throws Exception {
        log.info("Renvoi facture pour séjour={} par {}", sejourId, userId);

        var sejour = sejourRepo.findById(sejourId)
            .orElseThrow(() -> new NoSuchElementException("Séjour " + sejourId + " introuvable"));

        var facture = factureRepo.findBySejourId(sejourId)
            .orElseThrow(() -> new IllegalStateException(
                "Aucune facture pour le séjour " + sejourId));

        var locataire = locataireRepo.findById(sejour.locataireId())
            .orElseThrow(() -> new NoSuchElementException(
                "Locataire " + sejour.locataireId() + " introuvable"));

        byte[] pdfBytes;
        if (facture.pdfS3Key() != null && s3.exists(facture.pdfS3Key())) {
            pdfBytes = s3.downloadPdf(facture.pdfS3Key());
            log.debug("PDF existant réutilisé : {}", facture.pdfS3Key());
        } else {
            var toutes = ligneRepo.findBySejourId(sejourId);
            pdfBytes  = pdf.generer(facture, sejour, toutes, config.getAll());
            String s3Key = s3.uploadPdf(pdfBytes, facture.numero(), sejour.dateArrivee().getYear());
            factureRepo.updatePdfKey(facture.id(), s3Key);
            log.debug("PDF régénéré et uploadé : {}", s3Key);
        }

        String emailResp = config.get("email_resp_location").orElse("");
        email.envoyerFacture(facture, sejour, locataire.email(), pdfBytes, emailResp);
        factureRepo.marquerEmailEnvoye(facture.id());
        log.info("Facture {} renvoyée à {}", facture.numero(), locataire.email());
    }

    /**
     * Supprime les anciennes lignes calculées (HEBERGEMENT/ENERGIE/TAXE) et insère les nouvelles.
     * Appelée dans un contexte {@code @Transactional} : toutes les opérations partagent la même transaction.
     */
    private void recalculerLignesCalculees(UUID sejourId,
                                           LigneSejour heberg,
                                           LigneSejour energie,
                                           LigneSejour taxe) throws Exception {
        for (var type : List.of(TypeLigne.HEBERGEMENT, TypeLigne.ENERGIE, TypeLigne.TAXE)) {
            ligneRepo.deleteBySejourIdAndType(sejourId, type);
        }
        ligneRepo.insert(heberg);
        ligneRepo.insert(energie);
        ligneRepo.insert(taxe);
    }

    private Facture persistFacture(Optional<Facture> existante,
                                   UUID sejourId, String numero,
                                   FactureCalculService.Montants m) throws Exception {
        var f = new Facture(
            existante.map(Facture::id).orElse(UUID.randomUUID()),
            sejourId, numero, null,
            m.hebergement(), m.energie(), m.taxe(), m.supplements(), m.total(),
            StatutFacture.BROUILLON, null, false, null
        );
        return factureRepo.insert(f);
    }
}
