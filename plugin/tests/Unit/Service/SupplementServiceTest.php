<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Locagest\Repository\ConfigItemRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Service\SejourService;
use Locagest\Service\SupplementService;
use Locagest\Tests\Unit\LocagestUnitTestCase;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;
use Mockery;

class SupplementServiceTest extends LocagestUnitTestCase {

    private SupplementService $service;
    private LigneSejourRepository $ligne_repo;
    private ConfigItemRepository $item_repo;
    private SejourService $sejour_service;

    protected function setUp(): void {
        parent::setUp();
        $this->ligne_repo     = Mockery::mock( LigneSejourRepository::class );
        $this->item_repo      = Mockery::mock( ConfigItemRepository::class );
        $this->sejour_service = Mockery::mock( SejourService::class );
        $this->service        = new SupplementService( $this->ligne_repo, $this->item_repo, $this->sejour_service );
    }

    private function sejour_exist( int $id = 1 ): void {
        $this->sejour_service->shouldReceive( 'find_or_fail' )->with( $id )->andReturn( [ 'id' => $id ] );
    }

    // ── Supplément catalogue ──────────────────────────────────────────────────────

    public function test_catalogue_echoue_sans_config_item_id(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->ajouter( 1, [ 'type' => 'SUPPLEMENT' ] );
    }

    public function test_catalogue_echoue_si_item_introuvable(): void {
        $this->sejour_exist();
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 99 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->ajouter( 1, [ 'type' => 'SUPPLEMENT', 'config_item_id' => 99 ] );
    }

    public function test_catalogue_echoue_si_item_inactif(): void {
        $this->sejour_exist();
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 1 )->andReturn(
            [ 'id' => 1, 'libelle' => 'Assiette', 'prix_unitaire' => 5.0, 'unite' => 'UNITE', 'actif' => false ]
        );

        $this->expectException( NotFoundException::class );
        $this->service->ajouter( 1, [ 'type' => 'SUPPLEMENT', 'config_item_id' => 1 ] );
    }

    public function test_catalogue_cree_ligne_avec_calcul_correct(): void {
        $this->sejour_exist();
        $item = [ 'id' => 1, 'libelle' => 'Casse assiette', 'prix_unitaire' => 5.0, 'unite' => 'UNITE', 'actif' => true ];
        $this->item_repo->shouldReceive( 'find_by_id' )->andReturn( $item );
        $this->ligne_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['prix_total'] === 15.0 && $d['quantite'] === 3.0 )
            ->andReturn( 10 );
        $created = [ 'id' => 10, 'type_ligne' => 'SUPPLEMENT', 'prix_total' => 15.0 ];
        $this->ligne_repo->shouldReceive( 'find_by_id' )->with( 10 )->andReturn( $created );

        $result = $this->service->ajouter( 1, [ 'type' => 'SUPPLEMENT', 'config_item_id' => 1, 'quantite' => 3 ] );

        $this->assertSame( 15.0, $result['prix_total'] );
    }

    /** Unité SEJOUR → quantité forcée à 1 quelle que soit la valeur fournie */
    public function test_catalogue_sejour_force_quantite_a_un(): void {
        $this->sejour_exist();
        $item = [ 'id' => 2, 'libelle' => 'Ménage', 'prix_unitaire' => 80.0, 'unite' => 'SEJOUR', 'actif' => true ];
        $this->item_repo->shouldReceive( 'find_by_id' )->andReturn( $item );
        $this->ligne_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['quantite'] === 1.0 && $d['prix_total'] === 80.0 )
            ->andReturn( 11 );
        $expected = [ 'id' => 11, 'quantite' => 1.0, 'prix_total' => 80.0 ];
        $this->ligne_repo->shouldReceive( 'find_by_id' )->andReturn( $expected );

        // Même si quantite=5 est fournie, elle doit être ignorée
        $result = $this->service->ajouter( 1, [ 'type' => 'SUPPLEMENT', 'config_item_id' => 2, 'quantite' => 5 ] );
        $this->assertSame( 80.0, $result['prix_total'] );
    }

    // ── Saisie libre ──────────────────────────────────────────────────────────────

    public function test_libre_echoue_sans_libelle(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->ajouter( 1, [ 'type' => 'LIBRE', 'prix_unitaire' => 10.0 ] );
    }

    public function test_libre_echoue_si_prix_negatif(): void {
        $this->sejour_exist();

        $this->expectException( InvalidInputException::class );
        $this->service->ajouter( 1, [ 'type' => 'LIBRE', 'libelle' => 'Test', 'prix_unitaire' => -5.0 ] );
    }

    public function test_libre_accepte_prix_zero(): void {
        $this->sejour_exist();
        $this->ligne_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['prix_total'] === 0.0 && $d['statut'] === 'BROUILLON' )
            ->andReturn( 20 );
        $this->ligne_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 20, 'prix_total' => 0.0 ] );

        $result = $this->service->ajouter( 1, [ 'type' => 'LIBRE', 'libelle' => 'Gratuit', 'prix_unitaire' => 0.0 ] );
        $this->assertSame( 0.0, $result['prix_total'] );
    }

    public function test_libre_calcule_total_correctement(): void {
        $this->sejour_exist();
        $this->ligne_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['prix_total'] === 24.99 )
            ->andReturn( 21 );
        $this->ligne_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 21, 'prix_total' => 24.99 ] );

        $result = $this->service->ajouter( 1, [
            'type'          => 'LIBRE',
            'libelle'       => 'Dommages divers',
            'prix_unitaire' => 12.50,
            'quantite'      => 1.999,
        ] );

        $this->assertSame( 24.99, $result['prix_total'] );
    }

    public function test_libre_statut_brouillon(): void {
        $this->sejour_exist();
        $this->ligne_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['statut'] === 'BROUILLON' && $d['type_ligne'] === 'LIBRE' )
            ->andReturn( 22 );
        $this->ligne_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 22, 'statut' => 'BROUILLON' ] );

        $result = $this->service->ajouter( 1, [ 'type' => 'LIBRE', 'libelle' => 'Casse', 'prix_unitaire' => 5.0 ] );
        $this->assertSame( 'BROUILLON', $result['statut'] );
    }

    // ── sejour inexistant ─────────────────────────────────────────────────────────

    public function test_ajouter_echoue_si_sejour_introuvable(): void {
        $this->sejour_service->shouldReceive( 'find_or_fail' )->with( 99 )
            ->andThrow( NotFoundException::class, 'Séjour #99 introuvable.' );

        $this->expectException( NotFoundException::class );
        $this->service->ajouter( 99, [ 'type' => 'SUPPLEMENT', 'config_item_id' => 1 ] );
    }
}
