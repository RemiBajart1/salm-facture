package org.ucjgsalm.locagest.controller;

import io.micronaut.http.*;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import jakarta.validation.Valid;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.dto.*;
import org.ucjgsalm.locagest.repository.*;
import org.ucjgsalm.locagest.service.*;

/**
 * Routes administration — /api/v1/admin
 *
 * <pre>
 * GET    /api/v1/admin/tarifs                      liste les tarifs/personne
 * POST   /api/v1/admin/tarifs                      crée un tarif (trésorier)
 * PUT    /api/v1/admin/tarifs/{id}                 modifie un tarif (trésorier)
 * GET    /api/v1/admin/items                       liste les items catalogue
 * POST   /api/v1/admin/items                       crée un item
 * PUT    /api/v1/admin/items/{id}                  modifie un item
 * DELETE /api/v1/admin/items/{id}                  désactive un item
 * GET    /api/v1/admin/lignes-libres               saisies libres en attente
 * POST   /api/v1/admin/lignes-libres/{id}/promouvoir → catalogue
 * GET    /api/v1/admin/config                      config site (trésorier)
 * PATCH  /api/v1/admin/config                      modifie des clés (trésorier)
 * </pre>
 */
@Slf4j
@RequiredArgsConstructor
@Controller("/api/v1/admin")
@Secured({"tresorier", "resp_location"})
public class AdminController {

    private final ConfigItemService       itemService;
    private final TarifPersonneRepository tarifRepo;
    private final ConfigSiteRepository    configRepo;

    /** Liste tous les tarifs par personne (actifs et inactifs). */
    @Get("/tarifs")
    @Secured({"tresorier", "resp_location"})
    public List<TarifPersonneResponse> listTarifs() throws Exception {
        return tarifRepo.findAll().stream().map(this::toTarifResponse).toList();
    }

    /**
     * Crée un nouveau tarif par personne.
     * Accessible au trésorier uniquement.
     */
    @Post("/tarifs")
    @Secured("tresorier")
    @Status(HttpStatus.CREATED)
    public TarifPersonneResponse creerTarif(@Valid @Body TarifPersonneRequest req,
                                             Authentication auth) throws Exception {
        log.info("Création tarif '{}' à {}€/nuit par {}", req.nom(), req.prixNuit(), auth.getName());
        var tarif = new TarifPersonne(
            UUID.randomUUID(), req.nom(), req.prixNuit(), req.description(),
            req.actif(), req.ordre(), null, null, auth.getName()
        );
        return toTarifResponse(tarifRepo.insert(tarif));
    }

    /**
     * Modifie un tarif existant.
     * Accessible au trésorier uniquement.
     */
    @Put("/tarifs/{id}")
    @Secured("tresorier")
    public HttpResponse<TarifPersonneResponse> modifierTarif(UUID id,
                                                              @Valid @Body TarifPersonneRequest req,
                                                              Authentication auth) throws Exception {
        var existing = tarifRepo.findById(id);
        if (existing.isEmpty()) return HttpResponse.notFound();
        log.info("Modification tarif {} par {}", id, auth.getName());
        var updated = new TarifPersonne(
            id, req.nom(), req.prixNuit(), req.description(),
            req.actif(), req.ordre(), existing.get().createdAt(), null, auth.getName()
        );
        return HttpResponse.ok(toTarifResponse(tarifRepo.update(updated)));
    }

    /** Liste tous les items du catalogue (actifs et inactifs). */
    @Get("/items")
    public List<ConfigItemResponse> listItems() throws Exception {
        return itemService.listAll().stream().map(this::toItemResponse).toList();
    }

    /** Crée un nouvel item dans le catalogue des suppléments. */
    @Post("/items")
    @Status(HttpStatus.CREATED)
    public ConfigItemResponse creerItem(@Valid @Body ConfigItemRequest req) throws Exception {
        log.info("Création item catalogue '{}' ({})", req.designation(), req.categorie());
        var item = new ConfigItem(
            UUID.randomUUID(),
            req.designation(),
            CategorieItem.valueOf(req.categorie()),
            req.prixUnitaire(),
            UniteItem.valueOf(req.unite()),
            req.actif(),
            null, null
        );
        return toItemResponse(itemService.creer(item));
    }

    /** Modifie un item existant du catalogue. */
    @Put("/items/{id}")
    public HttpResponse<ConfigItemResponse> modifierItem(UUID id,
                                                          @Valid @Body ConfigItemRequest req) throws Exception {
        log.info("Modification item catalogue {}", id);
        var item = new ConfigItem(
            id,
            req.designation(),
            CategorieItem.valueOf(req.categorie()),
            req.prixUnitaire(),
            UniteItem.valueOf(req.unite()),
            req.actif(),
            null, null
        );
        return HttpResponse.ok(toItemResponse(itemService.modifier(item)));
    }

    /** Désactive logiquement un item (ne supprime pas pour conserver l'historique). */
    @Delete("/items/{id}")
    @Status(HttpStatus.NO_CONTENT)
    public void desactiverItem(UUID id) throws Exception {
        log.info("Désactivation item catalogue {}", id);
        itemService.desactiver(id);
    }

    /** Liste toutes les saisies libres en attente de promotion vers le catalogue. */
    @Get("/lignes-libres")
    public List<LigneSejourResponse> listLignesLibres() throws Exception {
        return itemService.listLignesLibres().stream()
            .map(l -> new LigneSejourResponse(
                l.id(), l.typeLigne().name(), l.designation(),
                l.quantite(), l.prixUnitaire(), l.montant(),
                l.statut().name(), l.saisiPar(), l.createdAt()))
            .toList();
    }

    /**
     * Promeut une saisie libre en item du catalogue.
     *
     * <p>Effet atomique :
     * <ol>
     *   <li>Crée un {@code ConfigItem} avec la désignation + prix de la ligne.</li>
     *   <li>Met à jour la ligne : {@code type_ligne=SUPPLEMENT}, {@code statut=CONFIRME}.</li>
     * </ol>
     * La facture n'est pas recalculée — le montant reste identique.
     */
    @Post("/lignes-libres/{ligneId}/promouvoir")
    @Status(HttpStatus.CREATED)
    public ConfigItemResponse promouvoir(UUID ligneId,
                                         @Valid @Body PromouvoirLigneRequest req) throws Exception {
        log.info("Promotion ligne libre {} → catalogue (catégorie={})", ligneId, req.categorieItem());
        var item = itemService.promouvoir(
            ligneId,
            CategorieItem.valueOf(req.categorieItem()),
            UniteItem.valueOf(req.unite()),
            req.nomCatalogue()
        );
        return toItemResponse(item);
    }

    /** Retourne toute la configuration site (trésorier uniquement). */
    @Get("/config")
    @Secured("tresorier")
    public Map<String, String> getConfig() throws Exception {
        return configRepo.getAll();
    }

    /**
     * Met à jour une ou plusieurs clés de configuration site.
     * Trésorier uniquement.
     */
    @Patch("/config")
    @Secured("tresorier")
    @Status(HttpStatus.NO_CONTENT)
    public void updateConfig(@Body ConfigSiteRequest req, Authentication auth) throws Exception {
        if (req.valeurs() == null) return;
        log.info("Mise à jour config site : {} clé(s) par {}", req.valeurs().size(), auth.getName());
        for (var entry : req.valeurs().entrySet()) {
            configRepo.set(entry.getKey(), entry.getValue(), auth.getName());
        }
    }

    private TarifPersonneResponse toTarifResponse(TarifPersonne t) {
        return new TarifPersonneResponse(t.id(), t.nom(), t.prixNuit(), t.description(),
            t.actif(), t.ordre());
    }

    private ConfigItemResponse toItemResponse(ConfigItem i) {
        return new ConfigItemResponse(i.id(), i.designation(), i.categorie().name(),
            i.prixUnitaire(), i.unite().name(), i.actif());
    }
}
