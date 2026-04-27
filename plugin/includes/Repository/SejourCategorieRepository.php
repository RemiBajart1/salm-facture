<?php

declare(strict_types=1);

namespace Locagest\Repository;

class SejourCategorieRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_sejour_categorie';
    }

    public function find_by_sejour( int $sejour_id ): array {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE sejour_id = %d ORDER BY ordre ASC", $sejour_id ),
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

    /** Met à jour nb_reelles pour une catégorie. */
    public function update_nb_reelles( int $id, int $nb_reelles ): void {
        global $wpdb;
        $wpdb->update( $this->table, [ 'nb_reelles' => $nb_reelles ], [ 'id' => $id ] );
    }

    public function delete_by_sejour( int $sejour_id ): void {
        global $wpdb;
        $wpdb->delete( $this->table, [ 'sejour_id' => $sejour_id ] );
    }
}
