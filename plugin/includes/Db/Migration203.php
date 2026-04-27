<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration203 {

    public static function run(): void {
        global $wpdb;
        $table = $wpdb->prefix . 'locagest_paiement';

        $col_type = $wpdb->get_var( $wpdb->prepare(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = 'photo_cheque_path'",
            $table
        ) );

        if ( $col_type && strtolower( $col_type ) !== 'text' ) {
            $wpdb->query( "ALTER TABLE {$table} MODIFY COLUMN photo_cheque_path TEXT NOT NULL" );
        }
    }
}
