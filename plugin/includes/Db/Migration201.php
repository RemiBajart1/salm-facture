<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration201 {

    public static function run(): void {
        global $wpdb;
        $p = $wpdb->prefix . 'locagest_';

        // Ajout de nb_enfants sur la table sejour (idempotent)
        $exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = 'nb_enfants'",
            $p . 'sejour'
        ) );
        if ( ! $exists ) {
            $wpdb->query( "ALTER TABLE {$p}sejour ADD COLUMN nb_enfants INT UNSIGNED NOT NULL DEFAULT 0 AFTER nb_adultes" );
        }

        // Nouvelle clé de configuration taxe enfant (INSERT IGNORE = idempotent)
        $wpdb->query( $wpdb->prepare(
            "INSERT IGNORE INTO {$p}config_site (cle, valeur, description) VALUES (%s, %s, %s)",
            'taxe_enfant_nuit', '0.00', 'Taxe de séjour par enfant par nuit (0 si exonéré)'
        ) );
    }
}
