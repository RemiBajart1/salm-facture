<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Locagest\Service\FactureCalculService;
use Locagest\Tests\Unit\LocagestUnitTestCase;

/**
 * Tests de FactureCalculService — pure PHP, aucun mock nécessaire.
 * Valide les règles métier §4.1 (hébergement), §4.2 (énergie), §4.3 (taxe de séjour).
 */
class FactureCalculServiceTest extends LocagestUnitTestCase {

    private FactureCalculService $service;

    protected function setUp(): void {
        parent::setUp();
        $this->service = new FactureCalculService();
    }

    // ── §4.1 Hébergement ─────────────────────────────────────────────────────────

    /** Cas validé en prod : 25 personnes < 40 min → forfait 40×18×2 = 1440€ */
    public function test_hebergement_forfait_une_categorie(): void {
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 25, 'prix_nuit_snapshot' => 18.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 2, min_personnes: 40, forfait_tarif_personne_id: 1 );

        $this->assertTrue( $result['forfait_applique'] );
        $this->assertSame( 1440.0, $result['prix_total'] );
        $this->assertSame( 2.0,    $result['quantite'] );
        $this->assertSame( 720.0,  $result['prix_unitaire'] );  // 40×18
        $this->assertStringContainsString( '40', $result['libelle'] );
    }

    /** 1 nuit, tarif membres 15€, 23 pers < 40 min → forfait 40×15×1 = 600€ */
    public function test_hebergement_forfait_tarif_membres(): void {
        $categories = [
            [ 'tarif_personne_id' => 2, 'nb_reelles' => 23, 'prix_nuit_snapshot' => 15.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 1, min_personnes: 40, forfait_tarif_personne_id: 2 );

        $this->assertTrue( $result['forfait_applique'] );
        $this->assertSame( 600.0, $result['prix_total'] );
    }

    /** 42 personnes >= 40 min → calcul réel : 42×18×2 = 1512€ */
    public function test_hebergement_reel_depasse_min(): void {
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 42, 'prix_nuit_snapshot' => 18.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 2, min_personnes: 40, forfait_tarif_personne_id: 1 );

        $this->assertFalse( $result['forfait_applique'] );
        $this->assertSame( 1512.0, $result['prix_total'] );
        $this->assertStringContainsString( 'nuitées', $result['libelle'] );
    }

    /** Exactement au minimum : 40 = 40 → réel (pas de forfait) */
    public function test_hebergement_exactement_au_min_pas_de_forfait(): void {
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 40, 'prix_nuit_snapshot' => 18.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 1, min_personnes: 40, forfait_tarif_personne_id: 1 );

        $this->assertFalse( $result['forfait_applique'] );
        $this->assertSame( 720.0, $result['prix_total'] );
    }

    /** Multi-catégories : forfait basé sur la catégorie de référence */
    public function test_hebergement_multi_categories_forfait(): void {
        // 20 extérieurs (18€) + 10 membres (15€) = 30 < 40 min
        // Forfait sur ref=extérieur (18€) → 40×18×2 = 1440€
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 20, 'prix_nuit_snapshot' => 18.0 ],
            [ 'tarif_personne_id' => 2, 'nb_reelles' => 10, 'prix_nuit_snapshot' => 15.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 2, min_personnes: 40, forfait_tarif_personne_id: 1 );

        $this->assertTrue( $result['forfait_applique'] );
        $this->assertSame( 1440.0, $result['prix_total'] );
    }

    /** Multi-catégories : total réel dépasse le min → calcul réel multi-tarif */
    public function test_hebergement_multi_categories_reel(): void {
        // 30 extérieurs (18€) + 20 membres (15€) = 50 > 40 min
        // Montant réel = (30×18 + 20×15) = 840, × 2 nuits = 1680€
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 30, 'prix_nuit_snapshot' => 18.0 ],
            [ 'tarif_personne_id' => 2, 'nb_reelles' => 20, 'prix_nuit_snapshot' => 15.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 2, min_personnes: 40, forfait_tarif_personne_id: 1 );

        $this->assertFalse( $result['forfait_applique'] );
        $this->assertSame( 1680.0, $result['prix_total'] );
    }

    /** Forfait avec 4 nuits */
    public function test_hebergement_forfait_quatre_nuits(): void {
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 10, 'prix_nuit_snapshot' => 18.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 4, min_personnes: 40, forfait_tarif_personne_id: 1 );

        $this->assertTrue( $result['forfait_applique'] );
        $this->assertSame( 2880.0, $result['prix_total'] );  // 40×18×4
    }

    /** Le prix de référence doit venir de la catégorie identifiée par forfait_tarif_personne_id */
    public function test_hebergement_forfait_prix_ref_correcte(): void {
        // Ref = tarif_id 2 (membres 15€), mais extérieurs (18€) aussi présents
        $categories = [
            [ 'tarif_personne_id' => 1, 'nb_reelles' => 5, 'prix_nuit_snapshot' => 18.0 ],
            [ 'tarif_personne_id' => 2, 'nb_reelles' => 5, 'prix_nuit_snapshot' => 15.0 ],
        ];

        $result = $this->service->calculer_hebergement( $categories, nb_nuits: 1, min_personnes: 40, forfait_tarif_personne_id: 2 );

        $this->assertTrue( $result['forfait_applique'] );
        $this->assertSame( 600.0, $result['prix_total'] );  // 40×15×1, pas 40×18
    }

    // ── §4.2 Énergie ─────────────────────────────────────────────────────────────

    /** Séjour 2 nuits, seuil 2 → min(2,2)×80 = 160€ */
    public function test_energie_nb_nuits_egal_seuil(): void {
        $result = $this->service->calculer_energie( nb_nuits: 2, energie_nb_nuits: 2, energie_prix_nuit: 80.0 );

        $this->assertSame( 160.0, $result['prix_total'] );
        $this->assertSame( 2.0,   $result['quantite'] );
        $this->assertSame( 80.0,  $result['prix_unitaire'] );
    }

    /** Séjour 1 nuit, seuil 2 → min(1,2)×80 = 80€ */
    public function test_energie_nb_nuits_sous_seuil(): void {
        $result = $this->service->calculer_energie( nb_nuits: 1, energie_nb_nuits: 2, energie_prix_nuit: 80.0 );

        $this->assertSame( 80.0, $result['prix_total'] );
        $this->assertSame( 1.0,  $result['quantite'] );
    }

    /** Séjour 5 nuits, seuil 2 → plafonné à min(5,2)×80 = 160€ */
    public function test_energie_plafonnee_au_seuil(): void {
        $result = $this->service->calculer_energie( nb_nuits: 5, energie_nb_nuits: 2, energie_prix_nuit: 80.0 );

        $this->assertSame( 160.0, $result['prix_total'] );
        $this->assertSame( 2.0,   $result['quantite'] );
    }

    /** Prix fractionnaire : arrondi à 2 décimales */
    public function test_energie_arrondi(): void {
        $result = $this->service->calculer_energie( nb_nuits: 3, energie_nb_nuits: 3, energie_prix_nuit: 33.33 );

        $this->assertSame( 99.99, $result['prix_total'] );
    }

    // ── §4.3 Taxe de séjour ───────────────────────────────────────────────────────

    /** Cas prod : 22 adultes × 2 nuits × 1.00€ = 44€ */
    public function test_taxe_cas_standard(): void {
        $result = $this->service->calculer_taxe( nb_adultes: 22, nb_nuits: 2, taxe_adulte_nuit: 1.0 );

        $this->assertSame( 44.0, $result['prix_total'] );
        $this->assertSame( 44.0, $result['quantite'] );  // nb_adultes × nb_nuits
        $this->assertSame( 1.0,  $result['prix_unitaire'] );
    }

    /** Tarif réglementaire 0.88€ : 20 adultes × 2 nuits × 0.88 = 35.20€ */
    public function test_taxe_tarif_reglementaire_0_88(): void {
        $result = $this->service->calculer_taxe( nb_adultes: 20, nb_nuits: 2, taxe_adulte_nuit: 0.88 );

        $this->assertSame( 35.20, $result['prix_total'] );
    }

    /** Pas d'adultes → taxe = 0 */
    public function test_taxe_zero_adultes(): void {
        $result = $this->service->calculer_taxe( nb_adultes: 0, nb_nuits: 3, taxe_adulte_nuit: 0.88 );

        $this->assertSame( 0.0, $result['prix_total'] );
    }

    /** Le libellé contient les 3 valeurs */
    public function test_taxe_libelle_complet(): void {
        $result = $this->service->calculer_taxe( nb_adultes: 5, nb_nuits: 3, taxe_adulte_nuit: 1.5 );

        $this->assertStringContainsString( '5', $result['libelle'] );
        $this->assertStringContainsString( '3', $result['libelle'] );
        $this->assertStringContainsString( '1.50', $result['libelle'] );
    }
}
