<?php

declare(strict_types=1);

namespace Locagest;

use Locagest\Api\AdminController;
use Locagest\Api\Auth;
use Locagest\Api\AuthController;
use Locagest\Api\LocataireController;
use Locagest\Api\SejourController;
use Locagest\Db\Migration100;
use Locagest\Db\Migration200;
use Locagest\Repository\ConfigItemRepository;
use Locagest\Repository\ConfigSiteRepository;
use Locagest\Repository\FactureRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Repository\LocataireRepository;
use Locagest\Repository\PaiementRepository;
use Locagest\Repository\SejourCategorieRepository;
use Locagest\Repository\SejourRepository;
use Locagest\Repository\TarifPersonneRepository;
use Locagest\Service\ConfigItemService;
use Locagest\Service\EmailService;
use Locagest\Service\FactureCalculService;
use Locagest\Service\FactureService;
use Locagest\Service\FileService;
use Locagest\Service\PaiementService;
use Locagest\Service\PdfService;
use Locagest\Service\SejourService;
use Locagest\Service\SupplementService;

class Plugin {

    private const DB_VERSION_OPTION = 'locagest_db_version';
    private const DB_VERSION        = '1.1.0';

    private SejourService    $sejour_svc;
    private FactureService   $facture_svc;
    private PaiementService  $paiement_svc;
    private SupplementService $supplement_svc;
    private FactureCalculService $calcul_svc;

    // ── Accesseurs pour les tests d'intégration ───────────────────────────────
    public function sejour_service():     SejourService      { return $this->sejour_svc; }
    public function facture_service():    FactureService     { return $this->facture_svc; }
    public function paiement_service():   PaiementService    { return $this->paiement_svc; }
    public function supplement_service(): SupplementService   { return $this->supplement_svc; }
    public function calcul_service():     FactureCalculService { return $this->calcul_svc; }

    /** Crée une instance câblée, sans hooks WP — pour les tests d'intégration uniquement. */
    public static function instance_for_tests(): self {
        $instance = new self();
        $instance->build_services();
        return $instance;
    }

    public static function run(): void {
        $instance = new self();
        $instance->build_services();
        add_action( 'rest_api_init',         [ $instance, 'register_routes' ] );
        add_action( 'init',                  [ $instance, 'maybe_migrate' ] );
        add_action( 'rest_api_init',         [ $instance, 'register_file_download_route' ] );
        add_action( 'admin_menu',            [ $instance, 'register_admin_page' ] );
        add_action( 'admin_enqueue_scripts', [ $instance, 'enqueue_frontend' ] );
    }

    public static function activate(): void {
        self::create_roles();
        Migration100::run();
        Migration200::run();
        update_option( self::DB_VERSION_OPTION, self::DB_VERSION );
    }

    public static function deactivate(): void {
        self::remove_roles();
    }

    /** Applique les migrations si la version en base est dépassée. */
    public function maybe_migrate(): void {
        if ( get_option( self::DB_VERSION_OPTION ) !== self::DB_VERSION ) {
            Migration100::run();
            Migration200::run();
            update_option( self::DB_VERSION_OPTION, self::DB_VERSION );
        }
    }

    public function register_routes(): void {
        $this->build_sejour_controller()->register_routes();
        $this->build_admin_controller()->register_routes();
        ( new AuthController() )->register_routes();
        ( new LocataireController( new LocataireRepository() ) )->register_routes();
    }

    private function build_services(): void {
        $sejour_repo    = new SejourRepository();
        $categorie_repo = new SejourCategorieRepository();
        $tarif_repo     = new TarifPersonneRepository();
        $locataire_repo = new LocataireRepository();
        $config_repo    = new ConfigSiteRepository();
        $facture_repo   = new FactureRepository();
        $ligne_repo     = new LigneSejourRepository();
        $paiement_repo  = new PaiementRepository();
        $item_repo      = new ConfigItemRepository();

        $this->calcul_svc     = new FactureCalculService();
        $pdf_service          = new PdfService();
        $file_service         = new FileService();
        $email_service        = new EmailService( $config_repo );
        $this->sejour_svc     = new SejourService( $sejour_repo, $categorie_repo, $tarif_repo, $locataire_repo, $config_repo );
        $this->facture_svc    = new FactureService( $facture_repo, $ligne_repo, $paiement_repo, $config_repo, $locataire_repo, $this->calcul_svc, $pdf_service, $file_service, $email_service, $this->sejour_svc );
        $this->paiement_svc   = new PaiementService( $paiement_repo, $facture_repo, $this->sejour_svc, $file_service );
        $this->supplement_svc = new SupplementService( $ligne_repo, $item_repo, $this->sejour_svc );
    }

    /** Enregistre la page d'administration LocaGest dans le menu WP. */
    public function register_admin_page(): void {
        add_menu_page(
            'LocaGest',
            'LocaGest',
            'read',
            'locagest',
            [ $this, 'render_admin_page' ],
            'dashicons-home',
            30,
        );
    }

    /** Affiche le point de montage de l'application React. */
    public function render_admin_page(): void {
        echo '<div id="root"></div>';
    }

    /**
     * Enqueue les assets React compilés par Vite et injecte la config (apiBase + JWT).
     * Ne s'exécute que sur la page LocaGest (hook = 'toplevel_page_locagest').
     */
    public function enqueue_frontend( string $hook ): void {
        if ( $hook !== 'toplevel_page_locagest' ) {
            return;
        }

        $build_dir = plugin_dir_path( __DIR__ ) . 'frontend/build';
        $build_url = plugin_dir_url( __DIR__ ) . 'frontend/build';

        // Le manifest Vite se trouve dans build/.vite/manifest.json
        $manifest_path = $build_dir . '/.vite/manifest.json';
        if ( ! file_exists( $manifest_path ) ) {
            // Fallback : manifest à la racine du build (ancienne version Vite)
            $manifest_path = $build_dir . '/manifest.json';
        }

        if ( file_exists( $manifest_path ) ) {
            $manifest = json_decode( (string) file_get_contents( $manifest_path ), true );
            $entry    = $manifest['src/main.tsx'] ?? $manifest['index.html'] ?? null;
            if ( $entry ) {
                wp_enqueue_script(
                    'locagest-app',
                    $build_url . '/' . $entry['file'],
                    [],
                    null,
                    true,
                );
                foreach ( $entry['css'] ?? [] as $css_file ) {
                    wp_enqueue_style( 'locagest-app', $build_url . '/' . $css_file, [], null );
                }
            }
        }

        // Génère un JWT pour l'utilisateur WP courant s'il possède un rôle LocaGest
        $token = null;
        $roles = [];
        $wp_user = wp_get_current_user();
        if ( $wp_user && $wp_user->ID ) {
            $locagest_roles = Auth::locagest_roles( $wp_user );
            if ( ! empty( $locagest_roles ) ) {
                $token_data = Auth::generate_token( $wp_user );
                $token      = $token_data['token'];
                $roles      = $token_data['roles'];
            }
        }

        wp_localize_script( 'locagest-app', 'locagestConfig', [
            'apiBase' => rest_url( 'locagest/v1' ),
            'token'   => $token,
            'roles'   => $roles,
            'userEmail' => $wp_user->user_email ?? null,
            'username'  => $wp_user->user_login ?? null,
        ] );
    }

    public function register_file_download_route(): void {
        $file_service = new FileService();
        register_rest_route( 'locagest/v1', '/files/download', [
            'methods'             => 'GET',
            'callback'            => function ( \WP_REST_Request $req ) use ( $file_service ) {
                $path    = rawurldecode( $req->get_param( 'locagest_file' ) ?? '' );
                $token   = $req->get_param( 'token' ) ?? '';
                $expires = (int) ( $req->get_param( 'expires' ) ?? 0 );

                if ( ! $file_service->verify_download_token( $path, $token, $expires ) ) {
                    return new \WP_REST_Response( [ 'message' => 'Lien expiré ou invalide.' ], 403 );
                }

                $uploads_base = wp_upload_dir()['basedir'];
                $full_path    = $uploads_base . '/' . $path;
                $real_base    = realpath( $uploads_base . '/locagest' );
                $real_path    = realpath( $full_path );

                // Protection path traversal : le fichier doit rester sous uploads/locagest/
                if ( ! $real_path || ! $real_base || ! str_starts_with( $real_path, $real_base . DIRECTORY_SEPARATOR ) ) {
                    return new \WP_REST_Response( [ 'message' => 'Accès refusé.' ], 403 );
                }

                header( 'Content-Type: application/pdf' );
                header( 'Content-Disposition: inline; filename="' . basename( $real_path ) . '"' );
                header( 'Content-Length: ' . filesize( $real_path ) );
                readfile( $real_path );
                exit;
            },
            'permission_callback' => '__return_true',
        ] );
    }

    private static function create_roles(): void {
        add_role( 'locagest_gardien',        'Gardien LocaGest',               [ 'read' => true ] );
        add_role( 'locagest_resp_location',  'Responsable location LocaGest',  [ 'read' => true ] );
        add_role( 'locagest_tresorier',      'Trésorier LocaGest',             [ 'read' => true ] );
        add_role( 'locagest_administrateur', 'Administrateur LocaGest',        [ 'read' => true ] );
    }

    private static function remove_roles(): void {
        foreach ( [ 'locagest_gardien', 'locagest_resp_location', 'locagest_tresorier', 'locagest_administrateur' ] as $role ) {
            remove_role( $role );
        }
    }

    // ── Factories ─────────────────────────────────────────────────────────────

    private function build_sejour_controller(): SejourController {
        $sejour_repo = new SejourRepository();
        $ligne_repo  = new LigneSejourRepository();

        return new SejourController(
            $sejour_repo,
            $this->sejour_svc,
            $this->facture_svc,
            $this->paiement_svc,
            $this->supplement_svc,
            $ligne_repo,
        );
    }

    private function build_admin_controller(): AdminController {
        $tarif_repo  = new TarifPersonneRepository();
        $config_repo = new ConfigSiteRepository();
        $ligne_repo  = new LigneSejourRepository();
        $item_repo   = new ConfigItemRepository();
        $item_service = new ConfigItemService( $item_repo, $ligne_repo );
        return new AdminController( $tarif_repo, $config_repo, $ligne_repo, $item_service );
    }
}
