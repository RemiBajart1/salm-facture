<?php

declare(strict_types=1);

namespace Locagest\Repository;

class TarifPersonneRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_tarif_personne';
    }

    public function find_all_actifs(): array {
        global $wpdb;
        return $wpdb->get_results(
            "SELECT * FROM {$this->table} WHERE actif = 1 ORDER BY ordre ASC",
            ARRAY_A
        ) ?: [];
    }

    public function find_by_id( int $id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ),
            ARRAY_A
        ) ?: null;
    }

    public function create( string $nom, float $prix, int $ordre ): int {
        global $wpdb;
        $wpdb->insert( $this->table, [ 'nom' => $nom, 'prix_nuit' => $prix, 'ordre' => $ordre ] );
        return (int) $wpdb->insert_id;
    }

    public function update( int $id, array $data ): void {
        global $wpdb;
        $wpdb->update( $this->table, $data, [ 'id' => $id ] );
    }
}
