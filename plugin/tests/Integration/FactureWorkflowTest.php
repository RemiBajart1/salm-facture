<?php

declare(strict_types=1);

namespace Locagest\Tests\Integration;

use Locagest\Utils\Exceptions\ImmuabiliteFactureException;

/**
 * Tests d'intégration du workflow complet de facturation.
 * Séjour → effectifs → supplément → génération facture → paiement → PAYEE.
 *
 * Exécuter dans le container Docker :
 * docker exec salm-facture-wordpress-1 bash -c \
 *   "cd /var/www/html/wp-content/plugins/locagest && vendor/bin/phpunit -c phpunit-integration.xml"
 */
class FactureWorkflowTest extends LocagestIntegrationTestCase {

    // ── workflow complet ──────────────────────────────────────────────────────────

    public function test_workflow_complet(): void {
        $plugin          = $this->make_plugin();
        $sejour_service  = $plugin->sejour_service();
        $calcul_service  = $plugin->calcul_service();
        $facture_service = $plugin->facture_service();
        $paiement_service = $plugin->paiement_service();
        $suppl_service   = $plugin->supplement_service();

        // 1. Créer le séjour (25 exterieurs < 40 min → forfait)
        $sejour = $sejour_service->creer( [
            'date_debut'                 => '2025-07-11',
            'date_fin'                   => '2025-07-13',
            'locataire'                  => [ 'nom' => 'Test Locataire', 'email' => 'test@locagest.fr' ],
            'categories'                 => [
                [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 30 ],
            ],
            'tarif_forfait_categorie_id' => 1,
            'min_personnes_total'        => 40,
        ] );

        $this->assertSame( 'PLANIFIE', $sejour['statut'] );
        $this->assertCount( 1, $sejour['categories'] );

        // 2. Saisir les effectifs réels (25 personnes < 40 min)
        $sejour = $sejour_service->update_personnes( $sejour['id'], [
            'nb_adultes' => 22,
            'categories' => [ [ 'id' => $sejour['categories'][0]['id'], 'nb_reelles' => 25 ] ],
        ] );

        $this->assertSame( 25, (int) $sejour['categories'][0]['nb_reelles'] );

        // 3. Ajouter un supplément catalogue (casse assiette × 3 = 15€)
        $item_id = self::$wpdb->insert( self::$wpdb->prefix . 'locagest_config_item', [
            'libelle'       => 'Casse assiette',
            'categorie'     => 'CASSE',
            'prix_unitaire' => 5.00,
            'unite'         => 'UNITE',
            'actif'         => 1,
            'ordre'         => 1,
        ] );
        $item_id = self::$wpdb->insert_id;
        $ligne = $suppl_service->ajouter( $sejour['id'], [
            'type'           => 'SUPPLEMENT',
            'config_item_id' => $item_id,
            'quantite'       => 3,
        ] );
        $this->assertSame( 15.0, (float) $ligne['prix_total'] );

        // 4. Générer la facture (sans envoi email en test)
        $facture = $facture_service->generer( $sejour['id'], envoyer_email: false );

        $this->assertSame( 'EMISE', $facture['statut'] );
        $this->assertStringStartsWith( 'FAC-', $facture['numero'] );

        // Calcul attendu : forfait 40×18×2=1440 + énergie 160 + taxe 22×2×1.00=44 + suppl 15 = 1659€
        $this->assertSame( 1440.0, (float) $facture['montant_hebergement'] );
        $this->assertSame( 160.0,  (float) $facture['montant_energie'] );
        $this->assertSame( 44.0,   (float) $facture['montant_taxe'] );
        $this->assertSame( 15.0,   (float) $facture['montant_supplements'] );
        $this->assertSame( 1659.0, (float) $facture['montant_total'] );

        // 5. Vérifier l'immuabilité
        $this->expectException( ImmuabiliteFactureException::class );
        $facture_service->generer( $sejour['id'], envoyer_email: false );
    }

    // ── transition PAYEE ─────────────────────────────────────────────────────────

    public function test_paiement_complet_passe_facture_en_payee(): void {
        $plugin           = $this->make_plugin();
        $sejour_service   = $plugin->sejour_service();
        $facture_service  = $plugin->facture_service();
        $paiement_service = $plugin->paiement_service();

        $sejour = $sejour_service->creer( [
            'date_debut'                 => '2025-08-01',
            'date_fin'                   => '2025-08-03',
            'categories'                 => [ [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 40 ] ],
            'tarif_forfait_categorie_id' => 1,
        ] );
        $sejour_service->update_personnes( $sejour['id'], [
            'nb_adultes' => 35,
            'categories' => [ [ 'id' => $sejour['categories'][0]['id'], 'nb_reelles' => 40 ] ],
        ] );

        $facture = $facture_service->generer( $sejour['id'], envoyer_email: false );
        $total   = (float) $facture['montant_total'];

        // Paiement partiel : facture reste EMISE
        $paiement_service->enregistrer( $sejour['id'], [
            'montant'       => $total / 2,
            'mode'          => 'VIREMENT',
            'date_paiement' => '2025-08-05',
        ] );

        $facture_mid = $facture_service->get_by_sejour( $sejour['id'] );
        $this->assertSame( 'EMISE', $facture_mid['statut'] );

        // Solde : facture passe PAYEE
        $paiement_service->enregistrer( $sejour['id'], [
            'montant'       => $total / 2,
            'mode'          => 'CHEQUE',
            'date_paiement' => '2025-08-10',
        ] );

        $facture_final = $facture_service->get_by_sejour( $sejour['id'] );
        $this->assertSame( 'PAYEE', $facture_final['statut'] );
        $this->assertCount( 2, $facture_final['paiements'] );
    }

    // ── numérotation séquentielle ─────────────────────────────────────────────────

    public function test_numeros_facture_sequentiels(): void {
        $plugin          = $this->make_plugin();
        $sejour_service  = $plugin->sejour_service();
        $facture_service = $plugin->facture_service();

        $numeros = [];
        for ( $i = 0; $i < 3; $i++ ) {
            $sejour = $sejour_service->creer( [
                'date_debut'                 => '2025-09-0' . ( $i + 1 ),
                'date_fin'                   => '2025-09-0' . ( $i + 2 ),
                'categories'                 => [ [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 40 ] ],
                'tarif_forfait_categorie_id' => 1,
            ] );
            $sejour_service->update_personnes( $sejour['id'], [
                'nb_adultes' => 10,
                'categories' => [ [ 'id' => $sejour['categories'][0]['id'], 'nb_reelles' => 40 ] ],
            ] );
            $facture   = $facture_service->generer( $sejour['id'], envoyer_email: false );
            $numeros[] = $facture['numero'];
        }

        // Tous différents
        $this->assertSame( array_unique( $numeros ), $numeros );
        // Format FAC-YYYY-NNN
        foreach ( $numeros as $num ) {
            $this->assertMatchesRegularExpression( '/^FAC-\d{4}-\d{3}$/', $num );
        }
        // Séquentiels
        $seqs = array_map( fn( $n ) => (int) substr( $n, -3 ), $numeros );
        $this->assertSame( [ $seqs[0], $seqs[0] + 1, $seqs[0] + 2 ], $seqs );
    }

    // ── calcul réel (total >= min) ────────────────────────────────────────────────

    public function test_calcul_reel_quand_total_depasse_minimum(): void {
        $plugin          = $this->make_plugin();
        $sejour_service  = $plugin->sejour_service();
        $facture_service = $plugin->facture_service();

        $sejour = $sejour_service->creer( [
            'date_debut'                 => '2025-10-10',
            'date_fin'                   => '2025-10-12',
            'categories'                 => [ [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 50 ] ],
            'tarif_forfait_categorie_id' => 1,
            'min_personnes_total'        => 40,
        ] );
        $sejour_service->update_personnes( $sejour['id'], [
            'nb_adultes' => 48,
            'categories' => [ [ 'id' => $sejour['categories'][0]['id'], 'nb_reelles' => 50 ] ],
        ] );

        $facture = $facture_service->generer( $sejour['id'], envoyer_email: false );

        // Calcul réel : 50×18×2 = 1800€ hébergement
        $this->assertSame( 1800.0, (float) $facture['montant_hebergement'] );
    }
}
