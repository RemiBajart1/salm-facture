<?php

declare(strict_types=1);

namespace Locagest\Db;

class Migration205 {

    public static function run(): void {
        global $wpdb;
        $p = $wpdb->prefix . 'locagest_';

        // 1. objet_sejour et nom_groupe sur la table sejour
        $cols = [
            'objet_sejour' => "ADD COLUMN objet_sejour VARCHAR(200) NOT NULL DEFAULT '' AFTER notes",
            'nom_groupe'   => "ADD COLUMN nom_groupe   VARCHAR(200) NOT NULL DEFAULT '' AFTER objet_sejour",
        ];
        foreach ( $cols as $col => $definition ) {
            $exists = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                $p . 'sejour',
                $col
            ) );
            if ( ! $exists ) {
                $wpdb->query( "ALTER TABLE {$p}sejour $definition" );
            }
        }

        // 2. Corriger unite = 'UNITE' pour la carte de membre (obligatoire)
        //    La carte de membre est facturée par personne, pas par séjour.
        $wpdb->query( $wpdb->prepare(
            "UPDATE {$p}config_item SET unite = %s WHERE categorie = %s AND obligatoire = 1",
            'UNITE',
            'ADHESION'
        ) );
    }
}
