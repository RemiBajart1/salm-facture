<?php

declare(strict_types=1);

namespace Locagest\Api;

use Locagest\Repository\LocataireRepository;
use Locagest\Utils\ExceptionHandler;

class LocataireController {

    private const NS = 'locagest/v1';

    public function __construct( private readonly LocataireRepository $locataire_repo ) {}

    public function register_routes(): void {
        register_rest_route( self::NS, '/locataires', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'search' ],
            'permission_callback' => Auth::require_role( 'locagest_resp_location', 'locagest_tresorier' ),
        ] );
    }

    /** GET /locataires?q=dupont */
    public function search( \WP_REST_Request $request ): \WP_REST_Response {
        return ExceptionHandler::handle( function () use ( $request ) {
            $q = sanitize_text_field( $request->get_param( 'q' ) ?? '' );
            if ( strlen( $q ) < 2 ) {
                return new \WP_REST_Response( [], 200 );
            }
            return $this->locataire_repo->search( $q );
        } );
    }
}
