package org.ucjgsalm.locagest.service;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.ConfigSiteRepository;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires de FactureCalculService.
 * Couvre toutes les règles métier :
 *  - Minimum de personnes (forfait unique)
 *  - Multi-tarifs avec complément minimum
 *  - Tarif moyen pondéré
 *  - Forfait énergies (plafond 2 nuits)
 *  - Taxe de séjour (adultes seulement)
 *  - Edge cases : 0 présents, 1 catégorie, exactement au minimum
 */
@DisplayName("FactureCalculService")
class FactureCalculServiceTest {

    private ConfigSiteRepository config;
    private FactureCalculService service;

    @BeforeEach
    void setUp() throws Exception {
        config = mock(ConfigSiteRepository.class);
        when(config.getDecimal("energie_prix_nuit")).thenReturn(new BigDecimal("80.00"));
        when(config.getInt("energie_nb_nuits")).thenReturn(2);
        when(config.getDecimal("taxe_adulte_nuit")).thenReturn(new BigDecimal("0.88"));
        service = new FactureCalculService(config);
    }

    // ══════════════════════════════════════════════════════════════════════
    // HÉBERGEMENT — cas normaux (total réel ≥ minimum)
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Tarif unique — 50 présents ≥ min 40 → pas de complément")
    void hebergement_tarifUnique_sansComplement() throws Exception {
        var sejour = sejour(7, 40);
        var cats   = List.of(categorie("Membre", "14.00", 50, 50));

        var m = service.calculer(sejour, cats, List.of());

        // 50 × 14 × 7 = 4 900
        assertThat(m.hebergement()).isEqualByComparingTo("4900.00");
        assertThat(m.nbFacturees()).isEqualTo(50);
    }

    @Test
    @DisplayName("Multi-tarifs — tous au-dessus du minimum")
    void hebergement_multiTarifs_sansComplement() throws Exception {
        var sejour = sejour(7, 40);
        var cats = List.of(
            categorie("Membre", "14.00", 25, 25),
            categorie("Jeunes", "12.00", 20, 20)
        );

        var m = service.calculer(sejour, cats, List.of());

        // (25 × 14 + 20 × 12) × 7 = (350 + 240) × 7 = 4 130
        assertThat(m.hebergement()).isEqualByComparingTo("4130.00");
        assertThat(m.nbFacturees()).isEqualTo(45);
    }

    @Test
    @DisplayName("Exactement au minimum → pas de complément")
    void hebergement_exactementAuMinimum() throws Exception {
        var sejour = sejour(7, 40);
        var cats = List.of(
            categorie("Membre", "14.00", 25, 25),
            categorie("Jeunes", "12.00", 15, 15)
        );

        var m = service.calculer(sejour, cats, List.of());

        // 40 présents = min 40 → pas de complément
        assertThat(m.nbFacturees()).isEqualTo(40);
        assertThat(m.hebergement()).isEqualByComparingTo("4130.00"); // (25×14 + 15×12) × 7
    }

    // ══════════════════════════════════════════════════════════════════════
    // HÉBERGEMENT — complément minimum
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Tarif unique — 30 présents < min 40 → complément 10 pers. au même tarif")
    void hebergement_complement_tarifUnique() throws Exception {
        var sejour = sejour(7, 40);
        var cats   = List.of(categorie("Membre", "14.00", null, 30));

        var m = service.calculer(sejour, cats, List.of());

        // 30 × 14 × 7 + 10 × 14 × 7 = 40 × 14 × 7 = 3 920
        assertThat(m.hebergement()).isEqualByComparingTo("3920.00");
        assertThat(m.nbFacturees()).isEqualTo(40);
    }

    @Test
    @DisplayName("Multi-tarifs — 38 présents < min 40 → complément au prix moyen pondéré")
    void hebergement_complement_multiTarifs() throws Exception {
        var sejour = sejour(7, 40);
        var cats = List.of(
            categorie("Membre", "14.00", 25, 25),
            categorie("Jeunes", "12.00", 15, 13)
        );

        var m = service.calculer(sejour, cats, List.of());

        // total réel = 38, écart = 2
        // montant réel = (25×14 + 13×12) × 7 = (350 + 156) × 7 = 3 542
        // prix moyen = 3542 / (38 × 7) = 3542 / 266 ≈ 13.3158...
        // complément = 13.3158 × 2 × 7 ≈ 186.42 (arrondi)
        // total ≈ 3542 + 186.42 = 3728.42 (à ±0.05 près selon arrondi)

        assertThat(m.nbFacturees()).isEqualTo(40);
        assertThat(m.hebergement())
            .isGreaterThan(new BigDecimal("3720"))
            .isLessThan(new BigDecimal("3740"));
    }

    @Test
    @DisplayName("0 personnes présentes — prix moyen = moyenne simple des catégories")
    void hebergement_zeroPresentss_prixMoyenSimple() throws Exception {
        var sejour = sejour(3, 40);
        var cats = List.of(
            categorie("Membre", "14.00", 20, 0),
            categorie("Jeunes", "12.00", 20, 0)
        );

        var m = service.calculer(sejour, cats, List.of());

        // prix moyen simple = (14 + 12) / 2 = 13.00
        // complément 40 × 13 × 3 = 1560
        assertThat(m.hebergement()).isEqualByComparingTo("1560.00");
        assertThat(m.nbFacturees()).isEqualTo(40);
    }

    // ══════════════════════════════════════════════════════════════════════
    // LIGNE FORFAIT — désignation unique
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("50 présents ≥ min 40 → ligne réelle 'Hébergement – 350 nuitées'")
    void ligneHebergement_facturationReelle() throws Exception {
        var sejour = sejour(7, 40);
        var cats   = List.of(categorie("Membre", "14.00", null, 50));
        var m      = service.calculer(sejour, cats, List.of());

        var ligne = service.ligneHebergement(sejour.id(), m, 7);

        assertThat(m.forfait()).isFalse();
        assertThat(ligne.typeLigne()).isEqualTo(TypeLigne.HEBERGEMENT);
        assertThat(ligne.quantite()).isEqualByComparingTo("1");
        assertThat(ligne.prixUnitaire()).isEqualByComparingTo(m.hebergement());
        assertThat(ligne.montant()).isEqualByComparingTo(m.hebergement());
        assertThat(ligne.designation()).contains("350").contains("nuitée");
    }

    @Test
    @DisplayName("30 présents < min 40 → ligne forfait 'Forfait hébergement – 40 personnes · 7 nuits'")
    void ligneHebergement_forfait() throws Exception {
        var sejour = sejour(7, 40);
        var cats   = List.of(categorie("Membre", "14.00", null, 30));
        var m      = service.calculer(sejour, cats, List.of());

        var ligne = service.ligneHebergement(sejour.id(), m, 7);

        assertThat(m.forfait()).isTrue();
        assertThat(m.nbFacturees()).isEqualTo(40);
        assertThat(ligne.designation()).contains("Forfait").contains("40 personnes").contains("7 nuits");
    }

    @Test
    @DisplayName("Désignation singulier pour 1 nuit")
    void ligneHebergement_singulier() throws Exception {
        var sejour = sejour(1, 40);
        var cats   = List.of(categorie("Membre", "14.00", null, 45));
        var m      = service.calculer(sejour, cats, List.of());
        var ligne  = service.ligneHebergement(sejour.id(), m, 1);

        assertThat(ligne.designation()).doesNotContain("nuits").contains("nuit");
    }

    // ══════════════════════════════════════════════════════════════════════
    // ÉNERGIES
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("7 nuits → forfait énergies = 2 × 80 = 160 €")
    void energie_sejourLong() throws Exception {
        var sejour = sejour(7, 40);
        var m = service.calculer(sejour, List.of(categorie("M", "14.00", null, 40)), List.of());
        assertThat(m.energie()).isEqualByComparingTo("160.00");
    }

    @Test
    @DisplayName("1 nuit → forfait énergies = 1 × 80 = 80 €")
    void energie_uneNuit() throws Exception {
        var sejour = sejour(1, 40);
        var m = service.calculer(sejour, List.of(categorie("M", "14.00", null, 40)), List.of());
        assertThat(m.energie()).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("2 nuits → plafond exact = 160 €")
    void energie_deuxNuits_plafondExact() throws Exception {
        var sejour = sejour(2, 40);
        var m = service.calculer(sejour, List.of(categorie("M", "14.00", null, 40)), List.of());
        assertThat(m.energie()).isEqualByComparingTo("160.00");
    }

    // ══════════════════════════════════════════════════════════════════════
    // TAXE DE SÉJOUR
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Taxe = nb_adultes × nb_nuits × 0.88")
    void taxe_calcul() throws Exception {
        var sejour = sejourAvecAdultes(7, 40, 22);
        var m = service.calculer(sejour, List.of(categorie("M", "14.00", null, 40)), List.of());
        // 22 × 7 × 0.88 = 135.52
        assertThat(m.taxe()).isEqualByComparingTo("135.52");
    }

    @Test
    @DisplayName("Taxe = 0 si nb_adultes non renseigné")
    void taxe_null_adultes() throws Exception {
        var sejour = sejour(7, 40); // nbAdultes = null
        var m = service.calculer(sejour, List.of(categorie("M", "14.00", null, 40)), List.of());
        assertThat(m.taxe()).isEqualByComparingTo("0.00");
    }

    // ══════════════════════════════════════════════════════════════════════
    // TOTAL
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Total = hébergement + énergie + taxe + suppléments")
    void total_sommeCorrecteDeToutesLesComposantes() throws Exception {
        var sejour = sejourAvecAdultes(7, 40, 22);
        var cats   = List.of(categorie("Membre", "14.00", 25, 25),
                             categorie("Jeunes", "12.00", 15, 15));
        var supplements = List.of(
            ligneSupplement("50.00")
        );

        var m = service.calculer(sejour, cats, supplements);

        // héberg = (25×14 + 15×12) × 7 = 4130
        // energie = 160
        // taxe = 22×7×0.88 = 135.52
        // supplement = 50
        // total = 4475.52
        assertThat(m.total()).isEqualByComparingTo("4475.52");
    }

    // ══════════════════════════════════════════════════════════════════════
    // FIXTURES
    // ══════════════════════════════════════════════════════════════════════

    private Sejour sejour(int nbNuits, int min) {
        var arrivee = LocalDate.of(2025, 3, 22);
        return new Sejour(UUID.randomUUID(), UUID.randomUUID(),
            StatutSejour.EN_COURS, arrivee, arrivee.plusDays(nbNuits), nbNuits,
            null, null, null, null,
            null, min, null, null, null, null,
            "test", null, null, null);
    }

    private Sejour sejourAvecAdultes(int nbNuits, int min, int nbAdultes) {
        var arrivee = LocalDate.of(2025, 3, 22);
        return new Sejour(UUID.randomUUID(), UUID.randomUUID(),
            StatutSejour.EN_COURS, arrivee, arrivee.plusDays(nbNuits), nbNuits,
            null, null, null, null,
            nbAdultes, min, null, null, null, null,
            "test", null, null, null);
    }

    private SejourCategorie categorie(String nom, String prix,
                                       Integer nbPrevues, Integer nbReelles) {
        return new SejourCategorie(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            nom, new BigDecimal(prix), nbPrevues, nbReelles, 0);
    }

    private LigneSejour ligneSupplement(String montant) {
        var m = new BigDecimal(montant);
        return new LigneSejour(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            TypeLigne.SUPPLEMENT, "Test supplément",
            BigDecimal.ONE, m, m,
            StatutLigne.CONFIRME, "test", null);
    }
}
