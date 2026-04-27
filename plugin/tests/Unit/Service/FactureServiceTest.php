<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Brain\Monkey\Functions;
use Locagest\Repository\ConfigSiteRepository;
use Locagest\Repository\FactureRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Repository\LocataireRepository;
use Locagest\Repository\PaiementRepository;
use Locagest\Service\EmailService;
use Locagest\Service\FactureCalculService;
use Locagest\Service\FactureService;
use Locagest\Service\FileService;
use Locagest\Service\PdfService;
use Locagest\Service\SejourService;
use Locagest\Tests\Unit\LocagestUnitTestCase;
use Locagest\Utils\Exceptions\ImmuabiliteFactureException;
use Mockery;

class FactureServiceTest extends LocagestUnitTestCase {

    private FactureService       $service;
    private FactureRepository    $facture_repo;
    private LigneSejourRepository $ligne_repo;
    private PaiementRepository   $paiement_repo;
    private ConfigSiteRepository $config_repo;
    private LocataireRepository  $locataire_repo;
    private FactureCalculService $calcul_service;
    private PdfService           $pdf_service;
    private FileService          $file_service;
    private EmailService         $email_service;
    private SejourService        $sejour_service;

    protected function setUp(): void {
        parent::setUp();
        $this->facture_repo   = Mockery::mock( FactureRepository::class );
        $this->ligne_repo     = Mockery::mock( LigneSejourRepository::class );
        $this->paiement_repo  = Mockery::mock( PaiementRepository::class );
        $this->config_repo    = Mockery::mock( ConfigSiteRepository::class );
        $this->locataire_repo = Mockery::mock( LocataireRepository::class );
        $this->calcul_service = Mockery::mock( FactureCalculService::class );
        $this->pdf_service    = Mockery::mock( PdfService::class );
        $this->file_service   = Mockery::mock( FileService::class );
        $this->email_service  = Mockery::mock( EmailService::class );
        $this->sejour_service = Mockery::mock( SejourService::class );

        $this->service = new FactureService(
            $this->facture_repo,
            $this->ligne_repo,
            $this->paiement_repo,
            $this->config_repo,
            $this->locataire_repo,
            $this->calcul_service,
            $this->pdf_service,
            $this->file_service,
            $this->email_service,
            $this->sejour_service,
        );
    }

    private function stub_wp_functions(): void {
        Functions\when( 'current_time' )->justReturn( '2025-07-15 10:00:00' );
    }

    private function sejour_detail(): array {
        return [
            'id'                         => 1,
            'nb_nuits'                   => 2,
            'nb_adultes'                 => 22,
            'locataire_id'               => 5,
            'min_personnes_total'        => 40,
            'tarif_forfait_categorie_id' => 1,
            'categories'                 => [
                [ 'tarif_personne_id' => 1, 'nb_reelles' => 25, 'prix_nuit_snapshot' => 18.0 ],
            ],
        ];
    }

    private function config(): array {
        return [
            'energie_nb_nuits'   => '2',
            'energie_prix_nuit'  => '80',
            'taxe_adulte_nuit'   => '1.00',
            'iban'               => 'FR76 1234',
            'adresse_facturation'=> '1 rue du Test',
            'nom_association'    => 'UCJG Salm',
        ];
    }

    // ── Immuabilité ───────────────────────────────────────────────────────────────

    public function test_generer_leve_exception_si_facture_emise(): void {
        $this->sejour_service->shouldReceive( 'get_detail' )->andReturn( $this->sejour_detail() );
        $this->config_repo->shouldReceive( 'get_all' )->andReturn( $this->config() );
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn(
            [ 'id' => 10, 'numero' => 'FAC-2025-001', 'statut' => 'EMISE' ]
        );

        $this->expectException( ImmuabiliteFactureException::class );
        $this->expectExceptionMessageMatches( '/FAC-2025-001/' );
        $this->service->generer( 1 );
    }

    public function test_generer_leve_exception_si_facture_payee(): void {
        $this->sejour_service->shouldReceive( 'get_detail' )->andReturn( $this->sejour_detail() );
        $this->config_repo->shouldReceive( 'get_all' )->andReturn( $this->config() );
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn(
            [ 'id' => 10, 'numero' => 'FAC-2025-002', 'statut' => 'PAYEE' ]
        );

        $this->expectException( ImmuabiliteFactureException::class );
        $this->service->generer( 1 );
    }

    public function test_generer_autorise_si_facture_brouillon(): void {
        $this->stub_wp_functions();
        $sejour = $this->sejour_detail();
        $this->sejour_service->shouldReceive( 'get_detail' )->andReturn( $sejour );
        $this->config_repo->shouldReceive( 'get_all' )->andReturn( $this->config() );

        $brouillon = [ 'id' => 10, 'numero' => 'FAC-2025-003', 'statut' => 'BROUILLON', 'locataire_email_snapshot' => '' ];
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn( $brouillon );

        $this->locataire_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'nom' => 'Test', 'email' => '', 'adresse' => '' ] );

        $this->calcul_service->shouldReceive( 'calculer_hebergement' )->andReturn( [ 'libelle' => 'Héb', 'quantite' => 2.0, 'prix_unitaire' => 720.0, 'prix_total' => 1440.0 ] );
        $this->calcul_service->shouldReceive( 'calculer_energie' )->andReturn( [ 'libelle' => 'Énergie', 'quantite' => 2.0, 'prix_unitaire' => 80.0, 'prix_total' => 160.0 ] );
        $this->calcul_service->shouldReceive( 'calculer_taxe' )->andReturn( [ 'libelle' => 'Taxe', 'quantite' => 44.0, 'prix_unitaire' => 1.0, 'prix_total' => 44.0 ] );

        $this->ligne_repo->shouldReceive( 'delete_calculated_lines' )->once();
        $this->ligne_repo->shouldReceive( 'create' )->times( 3 )->andReturn( 1 );
        $this->ligne_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->facture_repo->shouldReceive( 'update' )->twice();

        $emise = array_merge( $brouillon, [ 'statut' => 'EMISE', 'pdf_path' => 'locagest/factures/FAC-2025-003.pdf' ] );
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn( $emise );

        $this->pdf_service->shouldReceive( 'generer' )->andReturn( '%PDF-test' );
        $this->file_service->shouldReceive( 'save_pdf' )->andReturn( 'locagest/factures/FAC-2025-003.pdf' );

        $result = $this->service->generer( 1, envoyer_email: false );
        $this->assertSame( 'EMISE', $result['statut'] );
    }

    // ── Statut BROUILLON avant PDF, EMISE après ───────────────────────────────────

    public function test_generer_sauvegarde_brouillon_avant_pdf(): void {
        $this->stub_wp_functions();
        $sejour = $this->sejour_detail();
        $this->sejour_service->shouldReceive( 'get_detail' )->andReturn( $sejour );
        $this->config_repo->shouldReceive( 'get_all' )->andReturn( $this->config() );
        $facture_row = [ 'id' => 11, 'numero' => 'FAC-2025-004', 'statut' => 'BROUILLON', 'locataire_email_snapshot' => 'test@test.fr' ];
        // Premier appel : pas de facture existante. Deuxième appel (après create) : retourne la ligne créée.
        $this->facture_repo->shouldReceive( 'find_by_sejour' )
            ->andReturnValues( [ null, $facture_row ] );

        $this->locataire_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'nom' => 'Test', 'email' => 'test@test.fr', 'adresse' => '' ] );

        $this->calcul_service->shouldReceive( 'calculer_hebergement' )->andReturn( [ 'libelle' => 'H', 'quantite' => 2.0, 'prix_unitaire' => 720.0, 'prix_total' => 1440.0 ] );
        $this->calcul_service->shouldReceive( 'calculer_energie' )->andReturn( [ 'libelle' => 'E', 'quantite' => 2.0, 'prix_unitaire' => 80.0, 'prix_total' => 160.0 ] );
        $this->calcul_service->shouldReceive( 'calculer_taxe' )->andReturn( [ 'libelle' => 'T', 'quantite' => 44.0, 'prix_unitaire' => 1.0, 'prix_total' => 44.0 ] );

        $this->ligne_repo->shouldReceive( 'delete_calculated_lines' );
        $this->ligne_repo->shouldReceive( 'create' )->andReturn( 1 );
        $this->ligne_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->facture_repo->shouldReceive( 'next_numero' )->andReturn( 'FAC-2025-004' );

        // La création doit sauvegarder le statut BROUILLON
        $this->facture_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['statut'] === 'BROUILLON' )
            ->once()
            ->andReturn( 11 );

        $this->pdf_service->shouldReceive( 'generer' )->andReturn( '%PDF-test' );
        $this->file_service->shouldReceive( 'save_pdf' )->andReturn( 'locagest/factures/FAC-2025-004.pdf' );

        // La mise à jour finale doit passer à EMISE
        $this->facture_repo->shouldReceive( 'update' )
            ->withArgs( fn( $id, $d ) => isset( $d['statut'] ) && $d['statut'] === 'EMISE' )
            ->once();

        $this->email_service->shouldReceive( 'envoyer_facture' )->once();

        $this->service->generer( 1, envoyer_email: true );
    }
}
