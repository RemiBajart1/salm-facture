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
        $any   = Auth::require_role( 'locagest_gardien', 'locagest_resp_location', 'locagest_tresorier', 'locagest_administrateur' );
        $resp  = Auth::require_role( 'locagest_resp_location', 'locagest_tresorier' );
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
                'permission_callback' => $resp,
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'create' ],
                'permission_callback' => $resp,
            ],
        ] );

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get' ],
            'permission_callback' => $any,
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

        register_rest_route( self::NS, '/sejours/(?P<id>\d+)/facture/renvoyer', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'renvoyer_facture' ],
            'permission_callback' => $resp,
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
            $statut = $request->get_param( 'statut' ) ?: null;
            $page   = max( 0, (int) ( $request->get_param( 'page' ) ?? 0 ) );
            $size   = min( 100, max( 1, (int) ( $request->get_param( 'size' ) ?? 20 ) ) );
            $result = $this->sejour_repo->find_paginated( $statut, $page, $size );
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

    public function renvoyer_facture( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $this->facture_service->renvoyer( (int) $request->get_param( 'id' ) );
            return new \WP_REST_Response( [ 'message' => 'Facture renvoyée.' ], 200 );
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
            $pid   = (int) $request->get_param( 'pid' );
            $files = $request->get_file_params();
            $file  = $files['photo'] ?? null;

            if ( ! $file || ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) !== UPLOAD_ERR_OK ) {
                throw new InvalidInputException( 'Aucun fichier reçu ou erreur d\'upload.' );
            }

            $mime = $file['type'] ?? '';
            if ( ! in_array( $mime, [ 'image/jpeg', 'image/jpg', 'image/png', 'image/webp' ], true ) ) {
                throw new InvalidInputException( 'Type de fichier invalide. JPG, PNG ou WebP uniquement.' );
            }

            $content = file_get_contents( $file['tmp_name'] );
            $this->paiement_service->attacher_photo( $pid, $content, $mime );

            return new \WP_REST_Response( [ 'message' => 'Photo enregistrée.' ], 200 );
        } );
    }
}
