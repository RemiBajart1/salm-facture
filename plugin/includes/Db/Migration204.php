<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration204 {

    public static function run(): void {
        global $wpdb;
        $table = $wpdb->prefix . 'locagest_facture';

        $exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = 'montant_taxe_enfants'",
            $table
        ) );

        if ( ! $exists ) {
            $wpdb->query( "ALTER TABLE {$table} ADD COLUMN montant_taxe_enfants DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER montant_taxe" );
        }
    }
}

