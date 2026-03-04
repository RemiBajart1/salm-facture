package org.ucjgsalm.locagest.service;

import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.ConfigSiteRepository;

/**
 * Calcule l'ensemble des montants d'une facture.
 *
 * <p>Règle hébergement (§4.1) :
 * <ul>
 *   <li>Par nuit : {@code max(min_personnes_total, nb_reelles)} × prix_moyen_pondéré</li>
 *   <li>Si {@code nb_reelles < min_personnes_total} : le forfait s'applique (flag {@code forfait=true})</li>
 *   <li>Résultat : une seule ligne {@code HEBERGEMENT} sur la facture</li>
 * </ul>
 *
 * <p>Règle énergies : {@code min(nb_nuits, energie_nb_nuits) × energie_prix_nuit}
 *
 * <p>Règle taxe séjour : {@code nb_adultes × nb_nuits × taxe_adulte_nuit}
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
public class FactureCalculService {

    private final ConfigSiteRepository config;

    /**
     * Résultat du calcul complet d'une facture.
     *
     * @param hebergement  montant hébergement total
     * @param nbFacturees  personnes facturées = max(totalReel, minPersonnesTotal)
     * @param forfait      true si le minimum a été appliqué (totalReel &lt; minPersonnesTotal)
     * @param energie      montant énergies
     * @param taxe         montant taxe de séjour
     * @param supplements  montant total des suppléments confirmés
     * @param total        total général
     */
    public record Montants(
        BigDecimal hebergement,
        long       nbFacturees,
        boolean    forfait,
        BigDecimal energie,
        BigDecimal taxe,
        BigDecimal supplements,
        BigDecimal total
    ) {}

    /**
     * Calcule tous les montants pour un séjour donné.
     *
     * @param sejour              séjour à facturer
     * @param categories          catégories avec effectifs réels saisis par le gardien
     * @param lignesSupplements   lignes SUPPLEMENT et LIBRE existantes
     */
    public Montants calculer(Sejour sejour,
                             List<SejourCategorie> categories,
                             List<LigneSejour> lignesSupplements) throws Exception {

        var hebergement = calculerHebergement(sejour, categories);
        var energie     = calculerEnergie(sejour);
        var taxe        = calculerTaxe(sejour);
        var supplements = lignesSupplements.stream()
            .filter(l -> l.statut() != StatutLigne.LIBRE || l.montant() != null)
            .map(LigneSejour::montant)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        var total = hebergement.montant()
            .add(energie)
            .add(taxe)
            .add(supplements)
            .setScale(2, RoundingMode.HALF_UP);

        log.debug("Calcul facture séjour={} : héberg={} énergie={} taxe={} suppl={} total={}",
            sejour.id(), hebergement.montant(), energie, taxe, supplements, total);

        return new Montants(hebergement.montant(), hebergement.nbFacturees(), hebergement.forfait(),
                            energie, taxe, supplements, total);
    }

    /**
     * Crée la ligne HEBERGEMENT unique.
     *
     * <ul>
     *   <li>Forfait : {@code "Forfait hébergement – N personnes · M nuits"}</li>
     *   <li>Réel    : {@code "Hébergement – X nuitées"}</li>
     * </ul>
     */
    public LigneSejour ligneHebergement(UUID sejourId, Montants m, int nbNuits) {
        String designation = m.forfait()
            ? String.format("Forfait hébergement – %d personnes · %d nuit%s",
                m.nbFacturees(), nbNuits, nbNuits > 1 ? "s" : "")
            : String.format("Hébergement – %d nuitée%s",
                m.nbFacturees() * nbNuits, m.nbFacturees() * nbNuits > 1 ? "s" : "");
        return new LigneSejour(
            UUID.randomUUID(), sejourId, null,
            TypeLigne.HEBERGEMENT,
            designation,
            BigDecimal.ONE,
            m.hebergement(),
            m.hebergement(),
            StatutLigne.CONFIRME, "SYSTEM", null
        );
    }

    /** Crée la ligne ENERGIE. */
    public LigneSejour ligneEnergie(UUID sejourId, BigDecimal montant, int nbNuits, int nbNuitsFac) {
        int nuitsFac = Math.min(nbNuits, nbNuitsFac);
        String designation = nuitsFac == 1
            ? "Forfait énergies – 1 nuit"
            : String.format("Forfait énergies – %d premières nuits (inclus ensuite)", nuitsFac);
        return new LigneSejour(
            UUID.randomUUID(), sejourId, null,
            TypeLigne.ENERGIE,
            designation,
            BigDecimal.ONE,
            montant,
            montant,
            StatutLigne.CONFIRME, "SYSTEM", null
        );
    }

    /** Crée la ligne TAXE de séjour. */
    public LigneSejour ligneTaxe(UUID sejourId, BigDecimal montant, int nbAdultes, int nbNuits) {
        String designation = String.format(
            "Taxe de séjour – %d adulte%s × %d nuit%s",
            nbAdultes, nbAdultes > 1 ? "s" : "",
            nbNuits,   nbNuits > 1 ? "s" : ""
        );
        return new LigneSejour(
            UUID.randomUUID(), sejourId, null,
            TypeLigne.TAXE,
            designation,
            BigDecimal.ONE,
            montant,
            montant,
            StatutLigne.CONFIRME, "SYSTEM", null
        );
    }

    private record HebergementResult(BigDecimal montant, long nbFacturees, boolean forfait) {}

    private HebergementResult calculerHebergement(Sejour sejour, List<SejourCategorie> categories) {
        int  nbNuits = sejour.nbNuits();
        long min     = sejour.minPersonnesTotal();

        long       totalReel   = 0;
        BigDecimal montantReel = BigDecimal.ZERO;

        for (var cat : categories) {
            int nb = cat.nbReelles() != null ? cat.nbReelles() : 0;
            totalReel   += nb;
            montantReel  = montantReel.add(
                cat.getPrixNuitSnapshot()
                   .multiply(BigDecimal.valueOf(nb))
                   .multiply(BigDecimal.valueOf(nbNuits))
            );
        }

        boolean forfait     = totalReel < min;
        long    nbFacturees = forfait ? min : totalReel;

        BigDecimal montantFinal;
        if (!forfait) {
            montantFinal = montantReel;
        } else {
            BigDecimal prixMoyen;
            if (totalReel == 0) {
                // Edge case : aucun présent — moyenne simple des catégories
                prixMoyen = categories.isEmpty() ? BigDecimal.ZERO
                    : categories.stream()
                        .map(SejourCategorie::prixNuitSnapshot)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(categories.size()), 4, RoundingMode.HALF_UP);
            } else {
                prixMoyen = montantReel
                    .divide(BigDecimal.valueOf(totalReel)
                                     .multiply(BigDecimal.valueOf(nbNuits)),
                            4, RoundingMode.HALF_UP);
            }
            montantFinal = prixMoyen
                .multiply(BigDecimal.valueOf(min))
                .multiply(BigDecimal.valueOf(nbNuits))
                .setScale(2, RoundingMode.HALF_UP);

            log.debug("Forfait appliqué : {} présents < min {}, prix_moyen={}€, montant={}€",
                totalReel, min, prixMoyen, montantFinal);
        }

        return new HebergementResult(montantFinal, nbFacturees, forfait);
    }

    private BigDecimal calculerEnergie(Sejour sejour) throws Exception {
        BigDecimal prixNuit   = config.getDecimal("energie_prix_nuit");
        int        nbNuitsFac = config.getInt("energie_nb_nuits");
        long       nuits      = Math.min(sejour.nbNuits(), nbNuitsFac);
        return prixNuit.multiply(BigDecimal.valueOf(nuits)).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculerTaxe(Sejour sejour) throws Exception {
        if (sejour.nbAdultes() == null || sejour.nbAdultes() == 0) return BigDecimal.ZERO;
        BigDecimal tarifAdulte = config.getDecimal("taxe_adulte_nuit");
        return tarifAdulte
            .multiply(BigDecimal.valueOf(sejour.nbAdultes()))
            .multiply(BigDecimal.valueOf(sejour.nbNuits()))
            .setScale(2, RoundingMode.HALF_UP);
    }
}
