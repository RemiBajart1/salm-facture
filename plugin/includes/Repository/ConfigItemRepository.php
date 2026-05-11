<?php

declare(strict_types=1);

namespace Locagest\Repository;

class ConfigItemRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_config_item';
    }

    public function find_all_actifs(): array {
        global $wpdb;
        return $wpdb->get_results(
            "SELECT * FROM {$this->table} WHERE actif = 1 ORDER BY categorie ASC, ordre ASC",
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

    public function create( array $data ): int {
        global $wpdb;
        $wpdb->insert( $this->table, $data );
        return (int) $wpdb->insert_id;
    }

    public function update( int $id, array $data ): void {
        global $wpdb;
        $wpdb->update( $this->table, $data, [ 'id' => $id ] );
    }

    public function deactivate( int $id ): void {
        global $wpdb;
        $wpdb->update( $this->table, [ 'actif' => 0 ], [ 'id' => $id ] );
    }

    public function is_used( int $id ): bool {
        global $wpdb;
        $table = $wpdb->prefix . 'locagest_ligne_sejour';
        $count = (int) $wpdb->get_var(
            $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE config_item_id = %d", $id )
        );
        return $count > 0;
    }

    public function hard_delete( int $id ): void {
        global $wpdb;
        $wpdb->delete( $this->table, [ 'id' => $id ] );
    }
}
