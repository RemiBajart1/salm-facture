<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration202 {

    public static function run(): void {
        global $wpdb;
        $p = $wpdb->prefix . 'locagest_';

        // 1. Colonne obligatoire sur config_item
        $col_exists = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
            $p . 'config_item', 'obligatoire'
        ) );
        if ( ! $col_exists ) {
            $wpdb->query( "ALTER TABLE {$p}config_item ADD COLUMN obligatoire TINYINT(1) NOT NULL DEFAULT 0 AFTER actif" );
        }

        // 2. Ajouter ADHESION à l'ENUM categorie si absent
        $col_type = $wpdb->get_var( $wpdb->prepare(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
            $p . 'config_item', 'categorie'
        ) );
        if ( $col_type && strpos( $col_type, 'ADHESION' ) === false ) {
            $wpdb->query( "ALTER TABLE {$p}config_item MODIFY COLUMN categorie ENUM('LOCATION','CASSE','INTERVENTION','ADHESION') NOT NULL" );
        }

        // 3. Config par défaut
        $wpdb->query( $wpdb->prepare(
            "INSERT IGNORE INTO {$p}config_site (cle, valeur, description) VALUES (%s, %s, %s)",
            'prix_carte_membre', '15.00', 'Prix de la carte de membre annuelle'
        ) );

        // 4. Item catalogue Adhésion par défaut
        $exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$p}config_item WHERE categorie = %s AND obligatoire = 1 LIMIT 1",
            'ADHESION'
        ) );
        if ( ! $exists ) {
            $wpdb->insert( $p . 'config_item', [
                'libelle'       => 'Carte de membre annuelle',
                'categorie'     => 'ADHESION',
                'prix_unitaire' => 15.00,
                'unite'         => 'SEJOUR',
                'actif'         => 1,
                'obligatoire'   => 1,
                'ordre'         => 0,
            ] );
        }
    }
}
