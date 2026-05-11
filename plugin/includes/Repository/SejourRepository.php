<?php

declare(strict_types=1);

namespace Locagest\Repository;

class SejourRepository {

    private string $table;
    private string $table_locataire;

    public function __construct() {
        global $wpdb;
        $this->table           = $wpdb->prefix . 'locagest_sejour';
        $this->table_locataire = $wpdb->prefix . 'locagest_locataire';
    }

    /** SELECT de base avec JOIN locataire (snapshots nom / email / téléphone). */
    private function select_with_locataire(): string {
        return "SELECT s.*,
                       l.nom       AS locataire_nom_snapshot,
                       l.email     AS locataire_email_snapshot,
                       l.telephone AS locataire_telephone_snapshot,
                       l.adresse   AS locataire_adresse_snapshot
                FROM {$this->table} s
                LEFT JOIN {$this->table_locataire} l ON s.locataire_id = l.id";
    }

    public function find_by_id( int $id ): ?array {
        global $wpdb;
        return $wpdb->get_row(
            $wpdb->prepare( "{$this->select_with_locataire()} WHERE s.id = %d", $id ),
            ARRAY_A
        ) ?: null;
    }

    /** Retourne le séjour en cours (basé sur la date du jour) ou null. */
    public function find_current(): ?array {
        global $wpdb;
        $today = current_time( 'Y-m-d' );
        return $wpdb->get_row(
            $wpdb->prepare(
                "{$this->select_with_locataire()}
                 WHERE s.date_debut <= %s AND s.date_fin >= %s AND s.statut != 'ANNULE'
                 ORDER BY s.date_debut ASC LIMIT 1",
                $today,
                $today
            ),
            ARRAY_A
        ) ?: null;
    }

    /**
     * Liste paginée avec filtre optionnel sur le statut.
     * @param bool $actifs_only Si true, exclut les séjours dont date_fin < aujourd'hui
     * @param string $order 'ASC' ou 'DESC' pour le tri par date_debut
     * @return array{items: array, total: int, page: int, size: int}
     */
    public function find_paginated( ?string $statut, int $page, int $size, bool $actifs_only = false, string $order = 'DESC' ): array {
        global $wpdb;
        $offset = $page * $size;
        $order  = $order === 'ASC' ? 'ASC' : 'DESC';

        $where_parts = [];
        $params      = [];

        if ( $statut ) {
            $where_parts[] = 's.statut = %s';
            $params[]      = $statut;
        }
        if ( $actifs_only ) {
            $where_parts[] = 's.date_fin >= %s';
            $params[]      = current_time( 'Y-m-d' );
        }

        $where_clause = $where_parts ? 'WHERE ' . implode( ' AND ', $where_parts ) : '';
        $where_clause_count = $where_parts ? 'WHERE ' . implode( ' AND ', $where_parts ) : '';

        if ( $params ) {
            $count_sql = $wpdb->prepare( "SELECT COUNT(*) FROM {$this->table} s $where_clause_count", ...$params );
            $total     = (int) $wpdb->get_var( $count_sql );
            $items_sql = $wpdb->prepare(
                "{$this->select_with_locataire()} $where_clause ORDER BY s.date_debut $order LIMIT %d OFFSET %d",
                ...array_merge( $params, [ $size, $offset ] )
            );
        } else {
            $total     = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$this->table}" );
            $items_sql = $wpdb->prepare(
                "{$this->select_with_locataire()} ORDER BY s.date_debut $order LIMIT %d OFFSET %d",
                $size, $offset
            );
        }

        $items = $wpdb->get_results( $items_sql, ARRAY_A ) ?: [];
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
