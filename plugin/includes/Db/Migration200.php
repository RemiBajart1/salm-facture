<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration200 {

    public static function run(): void {
        global $wpdb;
        $p = $wpdb->prefix . 'locagest_';

        // Ajout des colonnes coordonnées sur la table facture (idempotent)
        $cols = [
            'siret_snapshot'     => "ADD COLUMN siret_snapshot VARCHAR(20) NOT NULL DEFAULT ''",
            'telephone_snapshot' => "ADD COLUMN telephone_snapshot VARCHAR(30) NOT NULL DEFAULT ''",
            'date_echeance'      => "ADD COLUMN date_echeance DATE",
        ];
        foreach ( $cols as $col => $definition ) {
            $exists = $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                $p . 'facture',
                $col
            ) );
            if ( ! $exists ) {
                $wpdb->query( "ALTER TABLE {$p}facture $definition" );
            }
        }

        // Nouvelles clés de configuration (INSERT IGNORE = idempotent)
        $config_defaults = [
            [ 'siret',                   '',  'SIRET de l\'association (affiché sur les factures)' ],
            [ 'telephone_facturation',   '',  'Téléphone de l\'association (affiché sur les factures)' ],
            [ 'delai_reglement_jours',   '7', 'Délai de règlement en jours (date d\'émission + X jours = date d\'échéance)' ],
        ];
        foreach ( $config_defaults as [$cle, $valeur, $desc] ) {
            $wpdb->query( $wpdb->prepare(
                "INSERT IGNORE INTO {$p}config_site (cle, valeur, description) VALUES (%s, %s, %s)",
                $cle, $valeur, $desc
            ) );
        }
    }
}