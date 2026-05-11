<?php

declare(strict_types=1);

namespace Locagest\Api;

use Locagest\Service\SejourService;
use Locagest\Service\FactureService;
use Locagest\Service\PaiementService;
use Locagest\Service\SupplementService;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Repository\SejourRepository;
use Locagest\Utils\ExceptionHandler;
use Locagest\Utils\Exceptions\InvalidInputException;

class SejourController {

    private const NS = 'locagest/v1';

    public function __construct(
        private readonly SejourRepository    $sejour_repo,
        private readonly SejourService       $sejour_service,
        private readonly FactureService      $facture_service,
        private readonly PaiementService     $paiement_service,
        private readonly SupplementService   $supplement_service,
        private readonly LigneSejourRepository $ligne_repo,
    ) {}

    public function register_routes(): void {
        $any       = Auth::require_role( 'locagest_gardien', 'locagest_resp_location', 'locagest_tresorier', 'locagest_administrateur' );
        $resp      = Auth::require_role( 'locagest_resp_location', 'locagest_tresorier' );
        $tresorier = Auth::require_role( 'locagest_tresorier' );
        $gardien_resp = Auth::require_role( 'locagest_gardien', 'locagest_resp_location', 'locagest_tresorier' );

        register_rest_route( self::NS, '/sejours/current', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_current' ],
            'permission_callback' => $any,
        ] );

        register_rest_route( self::NS, '/sejours', [
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'list' ],
                'permission_callback' => $any,
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'create' ],
                'permission_callback' => $resp,
            ],
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)', [
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'get' ],
                'permission_callback' => $any,
            ],
            [
                'methods'             => 'PUT',
                'callback'            => [ $this, 'update' ],
                'permission_callback' => $resp,
            ],
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/horaires', [
            'methods'             => 'PATCH',
            'callback'            => [ $this, 'patch_horaires' ],
            'permission_callback' => $gardien_resp,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/personnes', [
            'methods'             => 'PATCH',
            'callback'            => [ $this, 'patch_personnes' ],
            'permission_callback' => $gardien_resp,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/supplements', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'add_supplement' ],
            'permission_callback' => $gardien_resp,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/lignes', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_lignes' ],
            'permission_callback' => $any,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/facture/invalider', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'invalider_facture' ],
            'permission_callback' => $gardien_resp,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/facture/renvoyer', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'renvoyer_facture' ],
            'permission_callback' => $resp,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/facture/regenerer', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'regenerer_facture' ],
            'permission_callback' => $tresorier,
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/facture', [
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'generer_facture' ],
                'permission_callback' => $gardien_resp,
            ],
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'get_facture' ],
                'permission_callback' => $any,
            ],
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/paiements', [
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'add_paiement' ],
                'permission_callback' => $gardien_resp,
            ],
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'get_paiements' ],
                'permission_callback' => $any,
            ],
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/paiements/(?P<pid>\d+)/photo', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'upload_photo_cheque' ],
            'permission_callback' => $gardien_resp,
        ] );
    }

    public function get_current(): \WP_REST_Response {
        return ExceptionHandler::handle( function () {
            $sejour = $this->sejour_repo->find_current();
            if ( ! $sejour ) {
                // Retourner le prochain séjour planifié
                $result = $this->sejour_repo->find_paginated( 'PLANIFIE', 0, 1 );
                $sejour = $result['items'][0] ?? null;
            }
            return $sejour ? $this->sejour_service->get_detail( (int) $sejour['id'] ) : null;
        } );
    }

    public function list( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $statut      = $request->get_param( 'statut' ) ?: null;
            $page        = max( 0, (int) ( $request->get_param( 'page' ) ?? 0 ) );
            $size        = min( 100, max( 1, (int) ( $request->get_param( 'size' ) ?? 20 ) ) );
            $actif_only  = filter_var( $request->get_param( 'actif' ), FILTER_VALIDATE_BOOLEAN );
            $order       = strtoupper( $request->get_param( 'sort' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';
            $result = $this->sejour_repo->find_paginated( $statut, $page, $size, $actif_only, $order );
            return $this->sejour_service->enrich_list_with_categories( $result );
        } );
    }

    public function create( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $sejour = $this->sejour_service->creer( (array) $request->get_json_params() );
            return new \WP_REST_Response( $sejour, 201 );
        } );
    }

    public function get( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->sejour_service->get_detail( (int) $request->get_param( 'id' ) )
        );
    }

    public function update( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->sejour_service->update_sejour( (int) $request->get_param( 'id' ), (array) $request->get_json_params() )
        );
    }

    public function patch_horaires( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->sejour_service->update_horaires( (int) $request->get_param( 'id' ), (array) $request->get_json_params() )
        );
    }

    public function patch_personnes( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->sejour_service->update_personnes( (int) $request->get_param( 'id' ), (array) $request->get_json_params() )
        );
    }

    public function add_supplement( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $ligne = $this->supplement_service->ajouter( (int) $request->get_param( 'id' ), (array) $request->get_json_params() );
            return new \WP_REST_Response( $ligne, 201 );
        } );
    }

    public function get_lignes( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->ligne_repo->find_by_sejour( (int) $request->get_param( 'id' ) )
        );
    }

    public function generer_facture( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $params        = (array) $request->get_json_params();
            $envoyer_email = (bool) ( $params['envoyer_email'] ?? true );
            $facture       = $this->facture_service->generer( (int) $request->get_param( 'id' ), $envoyer_email );
            return new \WP_REST_Response( $facture, 201 );
        } );
    }

    public function get_facture( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->facture_service->get_by_sejour( (int) $request->get_param( 'id' ) )
        );
    }

    public function invalider_facture( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $sejour_id  = (int) $request->get_param( 'id' );
            $user_roles = (array) $request->get_param( '_jwt_user_roles' );
            $is_tresorier = in_array( 'locagest_tresorier', $user_roles, true );

            if ( ! $is_tresorier ) {
                $sejour = $this->sejour_service->find_or_fail( $sejour_id );
                if ( $sejour['statut'] !== 'EN_COURS' ) {
                    throw new InvalidInputException( "Le gardien ne peut invalider une facture que sur un séjour en cours." );
                }
            }

            return $this->facture_service->invalider( $sejour_id );
        } );
    }

    public function renvoyer_facture( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $this->facture_service->renvoyer( (int) $request->get_param( 'id' ) );
            return new \WP_REST_Response( [ 'message' => 'Facture renvoyée.' ], 200 );
        } );
    }

    public function regenerer_facture( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $facture = $this->facture_service->regenerer( (int) $request->get_param( 'id' ) );
            return new \WP_REST_Response( $facture, 200 );
        } );
    }

    public function add_paiement( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $paiements = $this->paiement_service->enregistrer( (int) $request->get_param( 'id' ), (array) $request->get_json_params() );
            return new \WP_REST_Response( $paiements, 201 );
        } );
    }

    public function get_paiements( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( fn() =>
            $this->paiement_service->list_by_sejour( (int) $request->get_param( 'id' ) )
        );
    }

    public function upload_photo_cheque( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $pid        = (int) $request->get_param( 'pid' );
            $raw        = $request->get_file_params()['photo'] ?? null;
            $max_size   = 5 * 1024 * 1024;
            $valid_mimes = [ 'image/jpeg', 'image/png', 'image/webp' ];

            if ( ! $raw ) {
                throw new InvalidInputException( 'Aucun fichier reçu.' );
            }

            // PHP normalise différemment un seul fichier vs plusieurs (photo[])
            $list = isset( $raw['name'] ) && is_array( $raw['name'] )
                ? array_map( fn( $i ) => [
                    'tmp_name' => $raw['tmp_name'][ $i ],
                    'error'    => $raw['error'][ $i ],
                    'size'     => $raw['size'][ $i ],
                  ], array_keys( $raw['name'] ) )
                : [ $raw ];

            $finfo      = new \finfo( FILEINFO_MIME_TYPE );
            $files_data = [];
            foreach ( $list as $file ) {
                if ( ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) !== UPLOAD_ERR_OK ) {
                    throw new InvalidInputException( "Erreur lors de l'envoi d'un fichier." );
                }
                if ( ( $file['size'] ?? 0 ) > $max_size ) {
                    throw new InvalidInputException( 'Fichier trop volumineux (5 Mo maximum).' );
                }
                $mime = $finfo->file( $file['tmp_name'] );
                if ( ! in_array( $mime, $valid_mimes, true ) ) {
                    throw new InvalidInputException( 'Type de fichier invalide. JPG, PNG ou WebP uniquement.' );
                }
                $files_data[] = [
                    'content' => file_get_contents( $file['tmp_name'] ),
                    'mime'    => $mime,
                ];
            }

            $this->paiement_service->attacher_photos( $pid, $files_data );
            return new \WP_REST_Response( [ 'message' => 'Photos enregistrées.' ], 200 );
        } );
    }
}
