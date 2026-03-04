package org.ucjgsalm.locagest.service;

import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.*;

/**
 * Gestion des items du catalogue et promotion des saisies libres.
 *
 * <p>Promotion LIBRE → catalogue : le resp. location ou le trésorier ajoute une saisie gardien
 * au catalogue. Cela crée un {@code ConfigItem} et met à jour la ligne existante (montant inchangé).
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
public class ConfigItemService {

    private final LigneSejourRepository ligneRepo;
    private final ConfigItemRepository  itemRepo;

    /** Retourne uniquement les items actifs du catalogue. */
    public List<ConfigItem> listActifs() throws Exception {
        return itemRepo.findActifs();
    }

    /** Retourne tous les items du catalogue (actifs et inactifs). */
    public List<ConfigItem> listAll() throws Exception {
        return itemRepo.findAll();
    }

    /** Retourne toutes les saisies libres en attente de promotion (tous séjours). */
    public List<LigneSejour> listLignesLibres() throws Exception {
        return ligneRepo.findAllLibre();
    }

    /**
     * Promeut une saisie libre en item du catalogue.
     *
     * @param ligneId      ID de la {@code LigneSejour} LIBRE à promouvoir
     * @param categorie    catégorie catalogue (CASSE / LOCATION / SERVICE)
     * @param unite        unité de comptage
     * @param nomCatalogue désignation dans le catalogue (null = utilise la désignation de la ligne)
     * @return le {@code ConfigItem} créé
     * @throws NoSuchElementException  si la ligne n'existe pas
     * @throws IllegalStateException   si la ligne n'est pas LIBRE
     */
    public ConfigItem promouvoir(UUID ligneId,
                                 CategorieItem categorie,
                                 UniteItem unite,
                                 String nomCatalogue) throws Exception {
        var ligne = ligneRepo.findById(ligneId)
            .orElseThrow(() -> new NoSuchElementException("Ligne " + ligneId + " introuvable"));

        if (ligne.statut() != StatutLigne.LIBRE) {
            throw new IllegalStateException("La ligne " + ligneId + " n'est pas LIBRE (statut : " + ligne.statut() + ")");
        }

        var item = new ConfigItem(
            UUID.randomUUID(),
            nomCatalogue != null && !nomCatalogue.isBlank() ? nomCatalogue : ligne.designation(),
            categorie,
            ligne.prixUnitaire(),
            unite,
            true,
            null, null
        );
        var itemCree = itemRepo.insert(item);
        ligneRepo.promouvoir(ligneId, itemCree.id());

        log.info("Ligne {} promue en item catalogue '{}' (id={})", ligneId, itemCree.designation(), itemCree.id());
        return itemCree;
    }

    /**
     * Crée un nouvel item dans le catalogue.
     *
     * @param item item à créer (l'id sera remplacé par un UUID généré)
     */
    public ConfigItem creer(ConfigItem item) throws Exception {
        var withId = new ConfigItem(UUID.randomUUID(), item.designation(), item.categorie(),
            item.prixUnitaire(), item.unite(), item.actif(), null, null);
        log.info("Création item catalogue '{}' ({}/{})", withId.designation(), withId.categorie(), withId.unite());
        return itemRepo.insert(withId);
    }

    /**
     * Modifie un item existant du catalogue.
     *
     * @param item item avec les nouvelles valeurs (l'id doit correspondre à un item existant)
     */
    public ConfigItem modifier(ConfigItem item) throws Exception {
        log.info("Modification item catalogue {}", item.id());
        return itemRepo.update(item);
    }

    /**
     * Désactive logiquement un item.
     * Ne supprime jamais pour conserver l'historique des suppléments passés.
     */
    public void desactiver(UUID id) throws Exception {
        itemRepo.findById(id).ifPresent(item -> {
            var desactive = new ConfigItem(item.id(), item.designation(), item.categorie(),
                item.prixUnitaire(), item.unite(), false, item.createdAt(), item.updatedAt());
            try {
                itemRepo.update(desactive);
                log.info("Item catalogue {} désactivé", id);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }
}
