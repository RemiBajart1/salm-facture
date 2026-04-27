<?php

declare(strict_types=1);

namespace Locagest\Repository;

class PaiementRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_paiement';
    }

    public function find_by_sejour( int $sejour_id ): array {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE sejour_id = %d ORDER BY date_paiement ASC", $sejour_id ),
            ARRAY_A
        ) ?: [];
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

    /** Total encaissé pour un séjour. */
    public function total_encaisse( int $sejour_id ): float {
        global $wpdb;
        return (float) ( $wpdb->get_var( $wpdb->prepare(
            "SELECT COALESCE(SUM(montant), 0) FROM {$this->table} WHERE sejour_id = %d",
            $sejour_id
        ) ) ?? 0 );
    }
}
