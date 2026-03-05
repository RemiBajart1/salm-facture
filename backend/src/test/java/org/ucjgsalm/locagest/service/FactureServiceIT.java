package org.ucjgsalm.locagest.service;

import io.micronaut.test.annotation.MockBean;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import io.micronaut.test.support.TestPropertyProvider;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

/**
 * Tests d'intégration de FactureService avec une base PostgreSQL réelle (Testcontainers).
 * S3Service, EmailService et PdfService sont remplacés par des mocks pour isoler
 * les appels AWS de la logique de persistance.
 *
 * <p>Cas couverts :
 * <ul>
 *   <li>Génération d'une facture avec montants calculés</li>
 *   <li>Erreur 409 si la facture est déjà EMISE</li>
 *   <li>Renvoi email avec PDF régénéré (pdfS3Key absent)</li>
 *   <li>Renvoi email avec PDF réutilisé depuis S3</li>
 * </ul>
 */
@MicronautTest(environments = "test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FactureServiceIT implements TestPropertyProvider {

    /** Conteneur PostgreSQL partagé pour toute la classe. */
    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("locagest_facture_test")
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

    @Inject FactureService          factureService;
    @Inject SejourService           sejourService;
    @Inject LocataireRepository     locataireRepo;
    @Inject TarifPersonneRepository tarifRepo;
    @Inject SejourCategorieRepository catRepo;
    @Inject FactureRepository       factureRepo;

    /** Accès aux instances mock injectées dans le contexte Micronaut. */
    @Inject S3Service    mockS3;
    @Inject EmailService mockEmail;
    @Inject PdfService   mockPdf;

    @MockBean(S3Service.class)
    S3Service mockS3Service() { return mock(S3Service.class); }

    @MockBean(EmailService.class)
    EmailService mockEmailService() { return mock(EmailService.class); }

    @MockBean(PdfService.class)
    PdfService mockPdfService() { return mock(PdfService.class); }

    private UUID tarifMembreId;

    @BeforeAll
    void chargerTarifInitial() throws Exception {
        tarifMembreId = tarifRepo.findAll().stream()
            .filter(t -> t.nom().contains("Membre"))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Tarif Membre absent — migration V1 non appliquée"))
            .id();
    }

    @BeforeEach
    void reinitialiserMocks() {
        // Remet les mocks à zéro avant chaque test (stubbing + historique)
        reset(mockS3, mockEmail, mockPdf);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Génération de facture
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("generer — crée la facture en BROUILLON avec les montants calculés")
    void generer_creeFactureAvecMontantsCalcules() throws Exception {
        var sejour  = preparerSejourPret("facture-gen@test.com");
        var facture = factureService.generer(sejour.id(), false, "test-tresorier");

        assertThat(facture.id()).isNotNull();
        assertThat(facture.numero()).startsWith("FAC-");
        assertThat(facture.montantTotal()).isGreaterThan(BigDecimal.ZERO);
        assertThat(facture.montantHebergement()).isGreaterThan(BigDecimal.ZERO);
        assertThat(facture.statut()).isEqualTo(StatutFacture.BROUILLON);
        assertThat(facture.emailEnvoye()).isFalse();

        // Le séjour passe en TERMINE après génération
        var sejourMaj = sejourService.findById(sejour.id()).orElseThrow();
        assertThat(sejourMaj.statut()).isEqualTo(StatutSejour.TERMINE);

        // Aucun appel AWS : envoyer=false
        verifyNoInteractions(mockS3, mockEmail, mockPdf);
    }

    @Test
    @DisplayName("generer — lève IllegalStateException si la facture est déjà EMISE")
    void generer_lanceExceptionSiFactureEmise() throws Exception {
        var sejour  = preparerSejourPret("facture-emise@test.com");
        var facture = factureService.generer(sejour.id(), false, "test");

        // Simuler l'émission (updatePdfKey bascule aussi le statut vers EMISE)
        factureRepo.updatePdfKey(facture.id(), "factures/2025/test.pdf");

        assertThatThrownBy(() -> factureService.generer(sejour.id(), false, "test"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("déjà émise");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Renvoi d'email
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("renvoyer — régénère le PDF et envoie l'email quand aucun PDF n'existe en S3")
    void renvoyer_regenerePdfEtEnvoieEmail() throws Exception {
        when(mockPdf.generer(any(), any(), any(), any())).thenReturn(new byte[]{1, 2, 3});
        when(mockS3.uploadPdf(any(), any(), anyInt())).thenReturn("factures/2025/FAC-test-regen.pdf");

        var sejour  = preparerSejourPret("facture-renvoyer@test.com");
        // generer(envoyer=false) : facture en BROUILLON, pdfS3Key=null
        factureService.generer(sejour.id(), false, "test");

        factureService.renvoyer(sejour.id(), "test-resp");

        // PDF régénéré car pdfS3Key était null
        verify(mockPdf).generer(any(), any(), any(), any());
        verify(mockS3).uploadPdf(any(), any(), anyInt());
        verify(mockEmail).envoyerFacture(any(), any(), any(), any(), any());

        // La facture en base doit être EMISE avec emailEnvoye=true
        var factureMaj = factureRepo.findBySejourId(sejour.id()).orElseThrow();
        assertThat(factureMaj.pdfS3Key()).isEqualTo("factures/2025/FAC-test-regen.pdf");
        assertThat(factureMaj.emailEnvoye()).isTrue();
    }

    @Test
    @DisplayName("renvoyer — réutilise le PDF S3 existant sans le régénérer")
    void renvoyer_reutilisePdfExistant() throws Exception {
        String cleS3 = "factures/2025/FAC-test-reutilise.pdf";
        when(mockS3.exists(cleS3)).thenReturn(true);
        when(mockS3.downloadPdf(cleS3)).thenReturn(new byte[]{4, 5, 6});

        var sejour  = preparerSejourPret("facture-reutilise@test.com");
        var facture = factureService.generer(sejour.id(), false, "test");
        // Simuler un PDF existant en S3 (updatePdfKey passe aussi la facture à EMISE)
        factureRepo.updatePdfKey(facture.id(), cleS3);

        factureService.renvoyer(sejour.id(), "test-resp");

        // PDF NON régénéré car il existait déjà en S3
        verify(mockPdf, never()).generer(any(), any(), any(), any());
        verify(mockS3, never()).uploadPdf(any(), any(), anyInt());
        verify(mockS3).downloadPdf(cleS3);
        verify(mockEmail).envoyerFacture(any(), any(), any(), any(), any());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Fixtures
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Crée un séjour prêt pour la facturation :
     * locataire créé, catégories snapshotées, effectifs réels saisis par le gardien.
     */
    private Sejour preparerSejourPret(String email) throws Exception {
        var locataire = locataireRepo.upsertByEmail(email, "Test Facture IT", null, null);

        var sejourInit = new Sejour(
            UUID.randomUUID(), locataire.id(), StatutSejour.PLANIFIE,
            LocalDate.of(2028, 8, 10), LocalDate.of(2028, 8, 17), 0,
            null, null, null, null,
            null, 40, ModePaiement.CHEQUE, null,
            null, null, "test-it", null, null, null
        );

        var sejour = sejourService.creer(sejourInit,
            List.of(new SejourService.CategorieSpec(tarifMembreId, 50)));

        var cats   = catRepo.findBySejourId(sejour.id());
        var saisie = new SejourService.SaisieCategorie(cats.get(0).id(), 45);
        sejourService.saisirPersonnes(sejour.id(), List.of(saisie), 30, "gardien-test");

        return sejourService.findById(sejour.id()).orElseThrow();
    }
}
