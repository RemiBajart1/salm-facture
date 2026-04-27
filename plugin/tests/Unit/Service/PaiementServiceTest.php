<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Locagest\Repository\FactureRepository;
use Locagest\Repository\PaiementRepository;
use Locagest\Service\FileService;
use Locagest\Service\PaiementService;
use Locagest\Service\SejourService;
use Locagest\Tests\Unit\LocagestUnitTestCase;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;
use Mockery;

class PaiementServiceTest extends LocagestUnitTestCase {

    private PaiementService $service;
    private PaiementRepository $paiement_repo;
    private FactureRepository $facture_repo;
    private SejourService $sejour_service;
    private FileService $file_service;

    protected function setUp(): void {
        parent::setUp();
        $this->paiement_repo  = Mockery::mock( PaiementRepository::class );
        $this->facture_repo   = Mockery::mock( FactureRepository::class );
        $this->sejour_service = Mockery::mock( SejourService::class );
        $this->file_service   = Mockery::mock( FileService::class );

        $this->service = new PaiementService(
            $this->paiement_repo,
            $this->facture_repo,
            $this->sejour_service,
            $this->file_service,
        );
    }

    private function sejour_exist( int $id = 1 ): void {
        $this->sejour_service->shouldReceive( 'find_or_fail' )->with( $id )->andReturn( [ 'id' => $id ] );
    }

    // ── Validation ────────────────────────────────────────────────────────────────

    public function test_enregistrer_echoue_si_montant_zero(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->enregistrer( 1, [ 'montant' => 0, 'mode' => 'CHEQUE', 'date_paiement' => '2025-07-15' ] );
    }

    public function test_enregistrer_echoue_si_montant_negatif(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->enregistrer( 1, [ 'montant' => -10, 'mode' => 'VIREMENT', 'date_paiement' => '2025-07-15' ] );
    }

    public function test_enregistrer_echoue_si_mode_invalide(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->enregistrer( 1, [ 'montant' => 100, 'mode' => 'CARTE', 'date_paiement' => '2025-07-15' ] );
    }

    public function test_enregistrer_echoue_si_date_manquante(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->enregistrer( 1, [ 'montant' => 100, 'mode' => 'ESPECES' ] );
    }

    public function test_enregistrer_accepte_modes_valides(): void {
        foreach ( [ 'CHEQUE', 'VIREMENT', 'ESPECES' ] as $mode ) {
            $this->sejour_service->shouldReceive( 'find_or_fail' )->andReturn( [ 'id' => 1 ] );
            $this->paiement_repo->shouldReceive( 'create' )->andReturn( 1 );
            $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn( null );
            $this->paiement_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

            $result = $this->service->enregistrer( 1, [ 'montant' => 50.0, 'mode' => $mode, 'date_paiement' => '2025-07-15' ] );
            $this->assertIsArray( $result, "Le mode $mode doit être accepté sans exception" );
        }
    }

    // ── Transition PAYEE ─────────────────────────────────────────────────────────

    public function test_facture_reste_emise_si_paiement_partiel(): void {
        $this->sejour_exist();
        $this->paiement_repo->shouldReceive( 'create' )->andReturn( 1 );
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->with( 1 )->andReturn(
            [ 'id' => 10, 'montant_total' => 1648.0 ]
        );
        // Total encaissé insuffisant
        $this->paiement_repo->shouldReceive( 'total_encaisse' )->with( 1 )->andReturn( 500.0 );
        // Ne doit PAS appeler update sur la facture
        $this->facture_repo->shouldNotReceive( 'update' );
        $this->paiement_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->enregistrer( 1, [ 'montant' => 500.0, 'mode' => 'VIREMENT', 'date_paiement' => '2025-07-15' ] );
    }

    public function test_facture_passe_en_payee_quand_total_couvert(): void {
        $this->sejour_exist();
        $this->paiement_repo->shouldReceive( 'create' )->andReturn( 2 );
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->with( 1 )->andReturn(
            [ 'id' => 10, 'montant_total' => 1648.0 ]
        );
        $this->paiement_repo->shouldReceive( 'total_encaisse' )->with( 1 )->andReturn( 1648.0 );
        $this->facture_repo->shouldReceive( 'update' )
            ->with( 10, [ 'statut' => 'PAYEE' ] )
            ->once();
        $this->paiement_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->enregistrer( 1, [ 'montant' => 1648.0, 'mode' => 'VIREMENT', 'date_paiement' => '2025-07-15' ] );
    }

    public function test_facture_passe_en_payee_si_trop_paye(): void {
        $this->sejour_exist();
        $this->paiement_repo->shouldReceive( 'create' )->andReturn( 3 );
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn(
            [ 'id' => 10, 'montant_total' => 1000.0 ]
        );
        // Paiement supérieur au total
        $this->paiement_repo->shouldReceive( 'total_encaisse' )->andReturn( 1050.0 );
        $this->facture_repo->shouldReceive( 'update' )
            ->with( 10, [ 'statut' => 'PAYEE' ] )
            ->once();
        $this->paiement_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->enregistrer( 1, [ 'montant' => 1050.0, 'mode' => 'CHEQUE', 'date_paiement' => '2025-07-15' ] );
    }

    public function test_pas_de_mise_a_jour_facture_si_aucune_facture(): void {
        $this->sejour_exist();
        $this->paiement_repo->shouldReceive( 'create' )->andReturn( 4 );
        // Aucune facture en base
        $this->facture_repo->shouldReceive( 'find_by_sejour' )->andReturn( null );
        $this->facture_repo->shouldNotReceive( 'update' );
        $this->paiement_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->enregistrer( 1, [ 'montant' => 200.0, 'mode' => 'ESPECES', 'date_paiement' => '2025-07-15' ] );
    }

    // ── list_by_sejour ────────────────────────────────────────────────────────────

    public function test_list_leve_not_found_si_sejour_absent(): void {
        $this->sejour_service->shouldReceive( 'find_or_fail' )->with( 42 )
            ->andThrow( NotFoundException::class, 'Séjour #42 introuvable.' );

        $this->expectException( NotFoundException::class );
        $this->service->list_by_sejour( 42 );
    }

    public function test_list_retourne_paiements_du_sejour(): void {
        $this->sejour_exist( 5 );
        $paiements = [
            [ 'id' => 1, 'montant' => 500.0, 'mode' => 'VIREMENT' ],
            [ 'id' => 2, 'montant' => 300.0, 'mode' => 'CHEQUE' ],
        ];
        $this->paiement_repo->shouldReceive( 'find_by_sejour' )->with( 5 )->andReturn( $paiements );

        $result = $this->service->list_by_sejour( 5 );
        $this->assertCount( 2, $result );
    }
}
