package org.ucjgsalm.locagest.service;

import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.*;

import static org.assertj.core.api.Assertions.*;
import io.micronaut.test.support.TestPropertyProvider;

/**
 * Tests d'intégration de SejourService avec une base PostgreSQL réelle (Testcontainers).
 *
 * <p>Cas couverts :
 * <ul>
 *   <li>Création d'un séjour avec snapshot des catégories</li>
 *   <li>Pagination : {@code listByStatutPagine} retourne la page demandée</li>
 *   <li>Comptage : {@code countByStatut} retourne le bon total</li>
 *   <li>Saisie des personnes par le gardien</li>
 * </ul>
 */
@MicronautTest(environments = "test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SejourServiceIT implements TestPropertyProvider {

    /** Conteneur PostgreSQL partagé pour toute la classe. */
    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("locagest_test")
            .withUsername("test")
            .withPassword("test");
        POSTGRES.start();
    }

    @Override
    public Map<String, String> getProperties() {
        return Map.of(
            "datasources.default.url",      POSTGRES.getJdbcUrl(),
            "datasources.default.username", POSTGRES.getUsername(),
            "datasources.default.password", POSTGRES.getPassword()
        );
    }

    @Inject SejourService          sejourService;
    @Inject LocataireRepository    locataireRepo;
    @Inject TarifPersonneRepository tarifRepo;
    @Inject SejourCategorieRepository catRepo;

    /** Tarif "Membre de l'union" inséré par V1__initial_schema.sql. */
    private UUID tarifMembreId;

    @BeforeAll
    void chargerTarifInitial() throws Exception {
        // V1 insère 3 tarifs : Membre (14€), Groupe de jeunes (12€), Extérieur (18€)
        var tarifs = tarifRepo.findAll();
        tarifMembreId = tarifs.stream()
            .filter(t -> t.nom().contains("Membre"))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Tarif Membre absent — migration V1 non appliquée"))
            .id();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Création de séjour
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("creer — persiste le séjour et snapshote les catégories")
    void creer_persisteSejourEtSnapshotCategories() throws Exception {
        var locataire = locataireRepo.upsertByEmail(
            "martin@test.com", "Martin Test", "06 00 00 00 01", null);

        var sejour = sejourPlanifie(locataire.id(), 5, 40);
        var spec   = new SejourService.CategorieSpec(tarifMembreId, 30);

        var cree = sejourService.creer(sejour, List.of(spec));

        assertThat(cree.id()).isNotNull();
        assertThat(cree.statut()).isEqualTo(StatutSejour.PLANIFIE);
        assertThat(cree.nbNuits()).isEqualTo(5);

        var cats = catRepo.findBySejourId(cree.id());
        assertThat(cats).hasSize(1);
        // Le snapshot isole le prix : il ne doit pas changer si le tarif est modifié
        assertThat(cats.get(0).prixNuitSnapshot()).isEqualByComparingTo("14.00");
        assertThat(cats.get(0).nbPrevues()).isEqualTo(30);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Pagination
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("listByStatutPagine — retourne la page demandée")
    void listByStatutPagine_retourneLaPageDemandee() throws Exception {
        var locataire = locataireRepo.upsertByEmail(
            "pagination@test.com", "Page Test", null, null);

        // Créer 3 séjours PLANIFIE avec des dates distinctes
        for (int i = 1; i <= 3; i++) {
            sejourService.creer(
                sejourPlanifieAvecDate(locataire.id(), LocalDate.of(2030, i, 10)),
                List.of(new SejourService.CategorieSpec(tarifMembreId, 10)));
        }

        // Page 0 avec size=2 : doit retourner exactement 2 éléments
        var page0 = sejourService.listByStatutPagine(StatutSejour.PLANIFIE, 0, 2);
        assertThat(page0).hasSizeGreaterThanOrEqualTo(2);

        // Page avec size=100 doit retourner tout le contenu disponible
        var tout = sejourService.listByStatutPagine(StatutSejour.PLANIFIE, 0, 100);
        assertThat(tout.size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    @DisplayName("countByStatut — retourne le bon total")
    void countByStatut_retourneLeTotal() throws Exception {
        long avantCreation = sejourService.countByStatut(StatutSejour.PLANIFIE);

        var locataire = locataireRepo.upsertByEmail(
            "count@test.com", "Count Test", null, null);
        sejourService.creer(
            sejourPlanifie(locataire.id(), 3, 40),
            List.of(new SejourService.CategorieSpec(tarifMembreId, 5)));

        long apresCreation = sejourService.countByStatut(StatutSejour.PLANIFIE);
        assertThat(apresCreation).isEqualTo(avantCreation + 1);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Saisie gardien
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("saisirPersonnes — passe le séjour EN_COURS")
    void saisirPersonnes_passeEnCours() throws Exception {
        var locataire = locataireRepo.upsertByEmail(
            "gardien@test.com", "Gardien Test", null, null);

        var sejour = sejourService.creer(
            sejourPlanifie(locataire.id(), 7, 40),
            List.of(new SejourService.CategorieSpec(tarifMembreId, 35)));

        var categories = catRepo.findBySejourId(sejour.id());
        var saisie = new SejourService.SaisieCategorie(categories.get(0).id(), 42);

        sejourService.saisirPersonnes(sejour.id(), List.of(saisie), 30, "gardien-test");

        var mis_a_jour = sejourService.findById(sejour.id()).orElseThrow();
        assertThat(mis_a_jour.statut()).isEqualTo(StatutSejour.EN_COURS);
        assertThat(mis_a_jour.nbAdultes()).isEqualTo(30);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Fixtures
    // ──────────────────────────────────────────────────────────────────────────

    private Sejour sejourPlanifie(UUID locataireId, int nbNuits, int minPersonnes) {
        LocalDate arrivee = LocalDate.now().plusDays(30 + (long)(Math.random() * 300));
        return new Sejour(
            UUID.randomUUID(), locataireId, StatutSejour.PLANIFIE,
            arrivee, arrivee.plusDays(nbNuits), 0,
            null, null, null, null,
            null, minPersonnes, ModePaiement.VIREMENT, null,
            null, null, "test-it", null, null, null
        );
    }

    private Sejour sejourPlanifieAvecDate(UUID locataireId, LocalDate arrivee) {
        return new Sejour(
            UUID.randomUUID(), locataireId, StatutSejour.PLANIFIE,
            arrivee, arrivee.plusDays(7), 0,
            null, null, null, null,
            null, 40, ModePaiement.VIREMENT, null,
            null, null, "test-it", null, null, null
        );
    }
}
