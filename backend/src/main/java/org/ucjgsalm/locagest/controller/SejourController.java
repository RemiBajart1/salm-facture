package org.ucjgsalm.locagest.controller;

import io.micronaut.core.annotation.Nullable;
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
import static org.ucjgsalm.locagest.dto.Dtos.*;
import org.ucjgsalm.locagest.repository.*;
import org.ucjgsalm.locagest.service.*;

/**
 * Routes séjours — /api/v1/sejours
 *
 * <pre>
 * GET    /api/v1/sejours/current         séjour en cours (gardien)
 * GET    /api/v1/sejours?statut=PLANIFIE  liste par statut (resp.)
 * POST   /api/v1/sejours                  créer un séjour (resp.)
 * GET    /api/v1/sejours/{id}             détail complet
 * PATCH  /api/v1/sejours/{id}/horaires    saisir horaires réels (gardien)
 * PATCH  /api/v1/sejours/{id}/personnes   saisir nb réels par catégorie (gardien)
 * POST   /api/v1/sejours/{id}/supplements ajouter un supplément
 * GET    /api/v1/sejours/{id}/lignes      toutes les lignes
 * POST   /api/v1/sejours/{id}/facture     générer/envoyer facture
 * GET    /api/v1/sejours/{id}/facture     lire la facture
 * POST   /api/v1/sejours/{id}/paiements   enregistrer paiement
 * GET    /api/v1/sejours/{id}/paiements   lister les paiements
 * </pre>
 */
@Slf4j
@RequiredArgsConstructor
@Controller("/api/v1/sejours")
@Secured("isAuthenticated()")
public class SejourController {

    private final SejourService          sejourService;
    private final LigneSejourRepository  ligneRepo;
    private final FactureService         factureService;
    private final FactureRepository      factureRepo;
    private final PaiementService        paiementService;
    private final S3Service              s3;
    private final LocataireRepository    locataireRepo;

    /** Retourne le séjour EN_COURS, ou le prochain PLANIFIE si aucun n'est en cours. */
    @Get("/current")
    @Secured({"gardien", "resp_location", "tresorier"})
    public HttpResponse<?> getCurrent() throws Exception {
        var sejour = sejourService.sejourEnCours();
        if (sejour.isEmpty()) {
            log.debug("Aucun séjour en cours");
            return HttpResponse.notFound();
        }
        return HttpResponse.ok(toResponse(sejour.get()));
    }

    /**
     * Liste les séjours filtrés par statut, avec pagination.
     *
     * @param statut statut cible (défaut : PLANIFIE)
     * @param page   numéro de page 0-based (défaut : 0)
     * @param size   taille de page (défaut : 20)
     */
    @Get
    @Secured({"resp_location", "tresorier"})
    public PagedResponse<SejourResponse> list(
            @QueryValue(defaultValue = "PLANIFIE") String statut,
            @QueryValue(defaultValue = "0")        int page,
            @QueryValue(defaultValue = "20")       int size) throws Exception {
        log.debug("Listing séjours statut={} page={} size={}", statut, page, size);
        var statutEnum  = StatutSejour.valueOf(statut.toUpperCase());
        long total      = sejourService.countByStatut(statutEnum);
        var content     = sejourService.listByStatutPagine(statutEnum, page, size)
                            .stream().map(this::toResponse).toList();
        int totalPages  = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return new PagedResponse<>(content, page, size, total, totalPages);
    }

    /** Retourne le détail complet d'un séjour avec ses catégories. */
    @Get("/{id}")
    public HttpResponse<?> get(UUID id) throws Exception {
        return sejourService.findById(id)
            .map(s -> HttpResponse.ok(toResponse(s)))
            .orElse(HttpResponse.notFound());
    }

    /**
     * Crée un nouveau séjour avec ses catégories de tarifs.
     * Le locataire est créé ou retrouvé par email (upsert).
     */
    @Post
    @Secured({"resp_location", "tresorier"})
    @Status(HttpStatus.CREATED)
    public SejourResponse create(@Valid @Body CreerSejourRequest req,
                                  @Nullable Authentication auth) throws Exception {
        log.info("Création séjour du {} au {} par {}", req.dateArrivee(), req.dateDepart(), userId(auth));

        var locataire = locataireRepo.upsertByEmail(
            req.emailLocataire(), req.nomLocataire(),
            req.telephoneLocataire(), req.adresseLocataire());

        var sejour = new Sejour(
            UUID.randomUUID(), locataire.id(), StatutSejour.PLANIFIE,
            req.dateArrivee(), req.dateDepart(), 0,
            req.heureArriveePrevue(), req.heureDepartPrevu(),
            null, null, null,
            req.minPersonnesTotal() != null ? req.minPersonnesTotal() : 0,
            req.modePaiement() != null ? ModePaiement.valueOf(req.modePaiement()) : null,
            null, req.optionsPresaisies(), req.notesInternes(),
            userId(auth), null, null, null
        );

        var specs = req.categories().stream()
            .map(c -> new SejourService.CategorieSpec(c.tarifId(), c.nbPrevues()))
            .toList();

        var created = sejourService.creer(sejour, specs);
        log.info("Séjour {} créé (id={})", created.dateArrivee(), created.id());
        return toResponse(created);
    }

    /** Enregistre les horaires réels d'arrivée/départ saisis par le gardien. */
    @Patch("/{id}/horaires")
    @Secured({"gardien", "resp_location"})
    public HttpResponse<?> patchHoraires(UUID id,
                                         @Body SaisieHorairesRequest req,
                                         @Nullable Authentication auth) throws Exception {
        log.info("Saisie horaires séjour={} par {}", id, userId(auth));
        sejourService.updateHorairesReels(id, req.heureArriveeReelle(), req.heureDepartReel(), userId(auth));
        return HttpResponse.noContent();
    }

    /** Enregistre les effectifs réels par catégorie et le nombre d'adultes. */
    @Patch("/{id}/personnes")
    @Secured({"gardien", "resp_location"})
    public HttpResponse<?> patchPersonnes(UUID id,
                                          @Valid @Body SaisiePersonnesRequest req,
                                          @Nullable Authentication auth) throws Exception {
        log.info("Saisie personnes séjour={} par {}", id, userId(auth));
        var saisies = req.categories().stream()
            .map(c -> new SejourService.SaisieCategorie(c.categorieId(), c.nbReelles()))
            .toList();
        sejourService.saisirPersonnes(id, saisies, req.nbAdultes(), userId(auth));
        return HttpResponse.noContent();
    }

    /** Ajoute un supplément (item catalogue ou saisie libre) à un séjour. */
    @Post("/{id}/supplements")
    @Secured({"gardien", "resp_location"})
    @Status(HttpStatus.CREATED)
    public LigneSejourResponse addSupplement(UUID id,
                                             @Valid @Body AjouterSupplementRequest req,
                                             @Nullable Authentication auth) throws Exception {
        boolean libre = (req.configItemId() == null);
        log.info("Ajout {} séjour={} par {}", libre ? "saisie libre" : "supplément", id, userId(auth));
        var ligne = new LigneSejour(
            UUID.randomUUID(), id,
            req.configItemId(),
            libre ? TypeLigne.LIBRE : TypeLigne.SUPPLEMENT,
            req.designation(),
            req.quantite(),
            req.prixUnitaire(),
            null,
            libre ? StatutLigne.LIBRE : StatutLigne.CONFIRME,
            userId(auth),
            null
        );
        return toLigneResponse(ligneRepo.insert(ligne));
    }

    /** Retourne toutes les lignes de facture d'un séjour. */
    @Get("/{id}/lignes")
    public List<LigneSejourResponse> getLignes(UUID id) throws Exception {
        return ligneRepo.findBySejourId(id).stream().map(this::toLigneResponse).toList();
    }

    /**
     * Génère la facture du séjour. Si {@code envoyer=true}, envoie également par email.
     * Erreur 409 si une facture EMISE ou PAYEE existe déjà.
     */
    @Post("/{id}/facture")
    @Secured({"gardien", "resp_location", "tresorier"})
    @Status(HttpStatus.CREATED)
    public FactureResponse genererFacture(UUID id,
                                          @Body GenererFactureRequest req,
                                          @Nullable Authentication auth) throws Exception {
        log.info("Génération facture séjour={} envoyer={} par {}", id, req.envoyer(), userId(auth));
        var facture = factureService.generer(id, req.envoyer(), userId(auth));
        log.info("Facture {} générée (statut={})", facture.numero(), facture.statut());
        return toFactureResponse(facture);
    }

    /**
     * Renvoie la facture du séjour par email.
     * Réutilise le PDF S3 existant si disponible, sinon le régénère.
     * Erreur 404 si le séjour ou la facture n'existent pas.
     */
    @Post("/{id}/facture/renvoyer")
    @Secured({"resp_location", "tresorier"})
    @Status(HttpStatus.NO_CONTENT)
    public void renvoyerFacture(UUID id, @Nullable Authentication auth) throws Exception {
        log.info("Renvoi facture séjour={} par {}", id, userId(auth));
        factureService.renvoyer(id, userId(auth));
    }

    /** Retourne la facture d'un séjour, avec URL présignée S3 du PDF si disponible. */
    @Get("/{id}/facture")
    public HttpResponse<?> getFacture(UUID id) throws Exception {
        return factureRepo.findBySejourId(id)
            .map(f -> HttpResponse.ok(toFactureResponse(f)))
            .orElse(HttpResponse.notFound());
    }

    /** Enregistre un paiement (chèque ou virement). Marque la facture PAYEE si le total est couvert. */
    @Post("/{id}/paiements")
    @Secured({"gardien", "resp_location"})
    @Status(HttpStatus.CREATED)
    public PaiementResponse enregistrerPaiement(UUID id,
                                                 @Valid @Body EnregistrerPaiementRequest req,
                                                 @Nullable Authentication auth) throws Exception {
        log.info("Enregistrement paiement {} {} pour séjour={}", req.montant(), req.mode(), id);
        var p = paiementService.enregistrer(
            id,
            ModePaiement.valueOf(req.mode()),
            req.montant(),
            req.dateEncaissement(),
            req.numeroCheque(),
            req.banqueEmettrice(),
            null, null,
            userId(auth)
        );
        return toPaiementResponse(p);
    }

    /** Liste tous les paiements d'un séjour. */
    @Get("/{id}/paiements")
    public List<PaiementResponse> getPaiements(UUID id) throws Exception {
        return paiementService.findBySejourId(id).stream()
            .map(this::toPaiementResponse).toList();
    }

    private SejourResponse toResponse(Sejour s) {
        List<SejourCategorieResponse> cats;
        try {
            cats = sejourService.categories(s.id()).stream()
                .map(c -> new SejourCategorieResponse(
                    c.id(), c.nomSnapshot(), c.prixNuitSnapshot(),
                    c.nbPrevues(), c.nbReelles()))
                .toList();
        } catch (Exception e) {
            log.warn("Impossible de charger les catégories du séjour {}", s.id(), e);
            cats = List.of();
        }
        return new SejourResponse(
            s.id(), s.statut().name(),
            s.dateArrivee(), s.dateDepart(), s.nbNuits(),
            s.heureArriveePrevue(), s.heureDepartPrevu(),
            s.heureArriveeReelle(), s.heureDepartReel(),
            s.nbAdultes(), s.minPersonnesTotal(),
            s.modePaiement() != null ? s.modePaiement().name() : null,
            s.dateLimitePaiement(),
            s.optionsPresaisies(), s.notesInternes(),
            null, null, null,
            cats
        );
    }

    private LigneSejourResponse toLigneResponse(LigneSejour l) {
        return new LigneSejourResponse(l.id(), l.typeLigne().name(), l.designation(),
            l.quantite(), l.prixUnitaire(), l.montant(), l.statut().name(),
            l.saisiPar(), l.createdAt());
    }

    private FactureResponse toFactureResponse(Facture f) {
        String pdfUrl = f.pdfS3Key() != null ? s3.presignedUrl(f.pdfS3Key()) : null;
        return new FactureResponse(f.id(), f.sejourId(), f.numero(), f.dateGeneration(),
            f.montantHebergement(), f.montantEnergie(), f.montantTaxe(),
            f.montantSupplements(), f.montantTotal(), f.statut().name(),
            f.emailEnvoye(), pdfUrl);
    }

    private PaiementResponse toPaiementResponse(Paiement p) {
        String photoUrl = p.chequeS3Key() != null ? s3.presignedUrl(p.chequeS3Key()) : null;
        return new PaiementResponse(p.id(), p.mode().name(), p.montant(),
            p.dateEncaissement(), p.numeroCheque(), p.banqueEmettrice(),
            photoUrl, p.enregistrePar(), p.createdAt());
    }

    private String userId(@Nullable Authentication auth) {
        return auth != null ? auth.getName() : "local-dev";
    }
}
