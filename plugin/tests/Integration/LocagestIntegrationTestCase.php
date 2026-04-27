<?php

declare(strict_types=1);

namespace Locagest\Tests\Integration;

use PHPUnit\Framework\TestCase;

/**
 * Classe de base pour les tests d'intégration.
 *
 * Prérequis : être exécuté dans le container Docker WordPress.
 * La base de données est réinitialisée autour des tables locagest_ avant chaque test.
 * Les tables WP core (wp_users, etc.) restent intactes.
 */
abstract class LocagestIntegrationTestCase extends TestCase {

    protected static \wpdb $wpdb;

    public static function setUpBeforeClass(): void {
        parent::setUpBeforeClass();
        global $wpdb;
        self::$wpdb = $wpdb;
    }

    protected function setUp(): void {
        parent::setUp();
        $this->truncate_locagest_tables();
        $this->seed_config_site();
        $this->seed_tarifs();
    }

    private function truncate_locagest_tables(): void {
        $db = self::$wpdb;
        $db->query( 'SET FOREIGN_KEY_CHECKS = 0' );
        foreach ( [
            'locagest_paiement',
            'locagest_ligne_sejour',
            'locagest_facture',
            'locagest_facture_sequence',
            'locagest_sejour_categorie',
            'locagest_sejour',
            'locagest_locataire',
            'locagest_config_item',
        ] as $table ) {
            $db->query( "TRUNCATE TABLE {$db->prefix}{$table}" );
        }
        $db->query( 'SET FOREIGN_KEY_CHECKS = 1' );
    }

    private function seed_config_site(): void {
        $db = self::$wpdb;
        foreach ( [
            [ 'cle' => 'min_personnes_defaut', 'valeur' => '40' ],
            [ 'cle' => 'energie_nb_nuits',     'valeur' => '2' ],
            [ 'cle' => 'energie_prix_nuit',    'valeur' => '80' ],
            [ 'cle' => 'taxe_adulte_nuit',     'valeur' => '1.00' ],
            [ 'cle' => 'iban',                 'valeur' => 'FR76 3000 1234 5678' ],
            [ 'cle' => 'adresse_facturation',  'valeur' => '1 rue du Test' ],
            [ 'cle' => 'nom_association',      'valeur' => 'UCJG Salm Test' ],
        ] as $row ) {
            $db->replace( $db->prefix . 'locagest_config_site', $row );
        }
    }

    private function seed_tarifs(): void {
        $db = self::$wpdb;
        foreach ( [
            [ 'id' => 1, 'nom' => 'Extérieur', 'prix_nuit' => 18.00, 'actif' => 1 ],
            [ 'id' => 2, 'nom' => 'Membres',   'prix_nuit' => 15.00, 'actif' => 1 ],
            [ 'id' => 3, 'nom' => 'Jeunes',    'prix_nuit' => 12.00, 'actif' => 1 ],
        ] as $row ) {
            $db->replace( $db->prefix . 'locagest_tarif_personne', $row );
        }
    }

    /** Retourne l'objet Plugin entièrement câblé (toute la DI) */
    protected function make_plugin(): \Locagest\Plugin {
        return \Locagest\Plugin::instance_for_tests();
    }
}
