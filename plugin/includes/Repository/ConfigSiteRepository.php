<?php

declare(strict_types=1);

namespace Locagest\Repository;

class ConfigSiteRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_config_site';
    }

    /** @return array<string,string> */
    public function get_all(): array {
        global $wpdb;
        $rows = $wpdb->get_results( "SELECT cle, valeur FROM {$this->table}", ARRAY_A );
        $map  = [];
        foreach ( $rows as $row ) {
            $map[ $row['cle'] ] = $row['valeur'];
        }
        return $map;
    }

    public function get( string $cle ): ?string {
        global $wpdb;
        return $wpdb->get_var( $wpdb->prepare( "SELECT valeur FROM {$this->table} WHERE cle = %s", $cle ) );
    }

    /** @param array<string,string> $data */
    public function patch( array $data ): void {
        global $wpdb;
        foreach ( $data as $cle => $valeur ) {
            $wpdb->update( $this->table, [ 'valeur' => $valeur ], [ 'cle' => $cle ] );
        }
    }
}
