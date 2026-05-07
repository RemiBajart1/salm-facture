<?php

declare(strict_types=1);

namespace Locagest\Api;

use Locagest\Repository\TarifPersonneRepository;
use Locagest\Repository\ConfigSiteRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Service\ConfigItemService;
use Locagest\Utils\ExceptionHandler;
use Locagest\Utils\Exceptions\NotFoundException;

class AdminController {

    private const NS = 'locagest/v1';

    public function __construct(
        private readonly TarifPersonneRepository $tarif_repo,
        private readonly ConfigSiteRepository    $config_repo,
        private readonly LigneSejourRepository   $ligne_repo,
        private readonly ConfigItemService       $item_service,
    ) {}

    public function register_routes(): void {
        $tresorier     = Auth::require_role( 'locagest_tresorier' );
        $resp_tresor   = Auth::require_role( 'locagest_resp_location', 'locagest_tresorier' );
        $any_admin     = Auth::require_role( 'locagest_resp_location', 'locagest_tresorier', 'locagest_administrateur' );
        $items_read    = Auth::require_role( 'locagest_gardien', 'locagest_resp_location', 'locagest_tresorier', 'locagest_administrateur' );

        // Tarifs
        register_rest_route( self::NS, '/admin/tarifs', [
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'list_tarifs' ],
                'permission_callback' => $resp_tresor,
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'create_tarif' ],
                'permission_callback' => $tresorier,
            ],
        ] );

        register_rest_route( self::NS, '/admin/tarifs/(?P<id>\d+)', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $this, 'update_tarif' ],
                'permission_callback' => $tresorier,
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $this, 'delete_tarif' ],
                'permission_callback' => $tresorier,
            ],
        ] );

        // Items catalogue
        register_rest_route( self::NS, '/admin/items', [
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'list_items' ],
                'permission_callback' => $items_read,
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'create_item' ],
                'permission_callback' => $any_admin,
            ],
        ] );

        register_rest_route( self::NS, '/admin/items/(?P<id>\d+)', [
            [
                'methods'             => 'PUT',
                'callback'            => [ $this, 'update_item' ],
                'permission_callback' => $any_admin,
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ $this, 'delete_item' ],
                'permission_callback' => $any_admin,
            ],
        ] );

        // Lignes libres
        register_rest_route( self::NS, '/admin/lignes-libres', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'list_lignes_libres' ],
            'permission_callback' => $resp_tresor,
        ] );

        register_rest_route( self::NS, '/admin/lignes-libres/(?P<id>\d+)/promouvoir', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'promouvoir' ],
            'permission_callback' => $resp_tresor,
        ] );

        // Config site
        register_rest_route( self::NS, '/admin/config', [
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'get_config' ],
                'permission_callback' => $tresorier,
            ],
            [
                'methods'             => 'PATCH',
                'callback'            => [ $this, 'patch_config' ],
                'permission_callback' => $tresorier,
            ],
        ] );
    }

    public function list_tarifs(): \WP_REST_Response {
        return ExceptionHandler::handle( fn() => $this->tarif_repo->find_all_actifs() );
    }

    public function create_tarif( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $data  = (array) $request->get_json_params();
            $max_o = max( array_column( $this->tarif_repo->find_all_actifs(), 'ordre' ) ?: [0] );
            $id    = $this->tarif_repo->create( $data['nom'], (float) $data['prix_nuit'], $max_o + 1 );
            return new \WP_REST_Response( $this->tarif_repo->find_by_id( $id ), 201 );
        } );
    }

    public function delete_tarif( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $id = (int) $request->get_param( 'id' );
            if ( ! $this->tarif_repo->find_by_id( $id ) ) throw new NotFoundException( "Tarif #$id introuvable." );
            $this->tarif_repo->deactivate( $id );
            return new \WP_REST_Response( null, 204 );
        } );
    }

    public function update_tarif( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $id   = (int) $request->get_param( 'id' );
            $data = (array) $request->get_json_params();
            if ( ! $this->tarif_repo->find_by_id( $id ) ) throw new NotFoundException( "Tarif #$id introuvable." );
            $this->tarif_repo->update( $id, array_filter( [
                'nom'      => $data['nom']      ?? null,
                'prix_nuit'=> $data['prix_nuit'] ?? null,
                'ordre'    => $data['ordre']     ?? null,
                'actif'    => isset( $data['actif'] ) ? (int) $data['actif'] : null,
            ], fn( $v ) => $v !== null ) );
            return new \WP_REST_Response( $this->tarif_repo->find_by_id( $id ), 200 );
        } );
    }

    public function list_items(): \WP_REST_Response {
        return ExceptionHandler::handle( fn() => $this->item_service->list_actifs() );
    }

    public function create_item( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $item = $this->item_service->create( (array) $request->get_json_params() );
            return new \WP_REST_Response( $item, 201 );
        } );
    }

    public function update_item( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->item_service->update( (int) $request->get_param( 'id' ), (array) $request->get_json_params() )
        );
    }

    public function delete_item( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $this->item_service->deactivate( (int) $request->get_param( 'id' ) );
            return new \WP_REST_Response( null, 204 );
        } );
    }

    public function list_lignes_libres(): \WP_REST_Response {
        return ExceptionHandler::handle( fn() => $this->ligne_repo->find_lignes_libres_en_attente() );
    }

    public function promouvoir( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $item = $this->item_service->promouvoir( (int) $request->get_param( 'id' ), (array) $request->get_json_params() );
            return new \WP_REST_Response( $item, 200 );
        } );
    }

    public function get_config(): \WP_REST_Response {
        return ExceptionHandler::handle( fn() => $this->config_repo->list_all() );
    }

    public function patch_config( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $body    = (array) $request->get_json_params();
            $entries = $body['entries'] ?? [];
            $map     = [];
            foreach ( $entries as $entry ) {
                if ( isset( $entry['cle'], $entry['valeur'] ) ) {
                    $map[ $entry['cle'] ] = $entry['valeur'];
                }
            }
            $this->config_repo->patch( $map );
            return new \WP_REST_Response( $this->config_repo->list_all(), 200 );
        } );
    }
}
