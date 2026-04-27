<?php

declare(strict_types=1);

namespace Locagest\Repository;

class SejourRepository {

    private string $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'locagest_sejour';
    }

    public function find_by_id( int $id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM {$this->table} WHERE id = %d", $id ),
            ARRAY_A
        ) ?: null;
    }

    /** Retourne le séjour en cours (basé sur la date du jour) ou null. */
    public function find_current(): ?array {
        global $wpdb;
        $today = current_time( 'Y-m-d' );
        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->table}
                 WHERE date_debut <= %s AND date_fin >= %s AND statut != 'ANNULE'
                 ORDER BY date_debut ASC LIMIT 1",
                $today,
                $today
            ),
            ARRAY_A
        ) ?: null;
    }

    /**
     * Liste paginée avec filtre optionnel sur le statut.
     * @return array{items: array, total: int, page: int, size: int}
     */
    public function find_paginated( ?string $statut, int $page, int $size ): array {
        global $wpdb;
        $offset = $page * $size;

        if ( $statut ) {
            $total = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table} WHERE statut = %s", $statut
            ) );
            $items = $wpdb->get_results( $wpdb->prepare(
                "SELECT * FROM {$this->table} WHERE statut = %s ORDER BY date_debut DESC LIMIT %d OFFSET %d",
                $statut, $size, $offset
            ), ARRAY_A ) ?: [];
        } else {
            $total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$this->table}" );
            $items = $wpdb->get_results( $wpdb->prepare(
                "SELECT * FROM {$this->table} ORDER BY date_debut DESC LIMIT %d OFFSET %d",
                $size, $offset
            ), ARRAY_A ) ?: [];
        }

        return [ 'items' => $items, 'total' => $total, 'page' => $page, 'size' => $size ];
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
}
