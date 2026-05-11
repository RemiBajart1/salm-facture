<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration206 {

    public static function run(): void {
        global $wpdb;
        $p = $wpdb->prefix . 'locagest_';

        // 1. Ajouter 'INVALIDE' à l'ENUM statut de la table facture
        $col_type = $wpdb->get_var( $wpdb->prepare(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = 'statut'",
            $p . 'facture'
        ) );
        if ( $col_type && ! str_contains( (string) $col_type, 'INVALIDE' ) ) {
            $wpdb->query( "ALTER TABLE {$p}facture MODIFY COLUMN statut ENUM('BROUILLON','EMISE','PAYEE','INVALIDE') NOT NULL DEFAULT 'BROUILLON'" );
        }

        // 2. Supprimer la contrainte UNIQUE sur sejour_id (un séjour peut avoir une facture invalide + une active)
        $unique_exists = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND INDEX_NAME = 'unique_sejour'",
            $p . 'facture'
        ) );
        if ( $unique_exists ) {
            $wpdb->query( "ALTER TABLE {$p}facture DROP INDEX unique_sejour" );
        }

        // 3. Ajouter un index normal sur sejour_id si absent
        $idx_exists = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND INDEX_NAME = 'idx_sejour'",
            $p . 'facture'
        ) );
        if ( ! $idx_exists ) {
            $wpdb->query( "ALTER TABLE {$p}facture ADD KEY idx_sejour (sejour_id)" );
        }
    }
}
