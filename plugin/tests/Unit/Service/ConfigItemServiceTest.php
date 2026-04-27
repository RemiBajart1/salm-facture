<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Locagest\Repository\ConfigItemRepository;
use Locagest\Repository\LigneSejourRepository;
use Locagest\Service\ConfigItemService;
use Locagest\Tests\Unit\LocagestUnitTestCase;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;
use Mockery;

class ConfigItemServiceTest extends LocagestUnitTestCase {

    private ConfigItemService $service;
    private ConfigItemRepository $item_repo;
    private LigneSejourRepository $ligne_repo;

    protected function setUp(): void {
        parent::setUp();
        $this->item_repo  = Mockery::mock( ConfigItemRepository::class );
        $this->ligne_repo = Mockery::mock( LigneSejourRepository::class );
        $this->service    = new ConfigItemService( $this->item_repo, $this->ligne_repo );
    }

    // ── create : validation ───────────────────────────────────────────────────────

    public function test_create_echoue_si_libelle_vide(): void {
        $this->expectException( InvalidInputException::class );
        $this->service->create( [ 'libelle' => '', 'categorie' => 'CASSE', 'prix_unitaire' => 10.0 ] );
    }

    public function test_create_echoue_si_categorie_invalide(): void {
        $this->expectException( InvalidInputException::class );
        $this->service->create( [ 'libelle' => 'Test', 'categorie' => 'INVALID', 'prix_unitaire' => 5.0 ] );
    }

    public function test_create_echoue_si_prix_negatif(): void {
        $this->expectException( InvalidInputException::class );
        $this->service->create( [ 'libelle' => 'Test', 'categorie' => 'CASSE', 'prix_unitaire' => -1.0 ] );
    }

    public function test_create_accepte_prix_zero(): void {
        $item = [ 'id' => 1, 'libelle' => 'Test', 'categorie' => 'CASSE', 'prix_unitaire' => 0.0, 'unite' => 'UNITE', 'actif' => true ];
        $this->item_repo->shouldReceive( 'find_all_actifs' )->andReturn( [] );
        $this->item_repo->shouldReceive( 'create' )->andReturn( 1 );
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 1 )->andReturn( $item );

        $result = $this->service->create( [ 'libelle' => 'Test', 'categorie' => 'CASSE', 'prix_unitaire' => 0.0 ] );
        $this->assertSame( 1, $result['id'] );
    }

    public function test_create_echoue_si_unite_invalide(): void {
        $this->expectException( InvalidInputException::class );
        $this->service->create( [ 'libelle' => 'Test', 'categorie' => 'CASSE', 'prix_unitaire' => 5.0, 'unite' => 'HEURE' ] );
    }

    public function test_create_ordre_suit_le_max_actuel(): void {
        $actifs = [
            [ 'id' => 1, 'ordre' => 3 ],
            [ 'id' => 2, 'ordre' => 7 ],
        ];
        $this->item_repo->shouldReceive( 'find_all_actifs' )->andReturn( $actifs );
        $this->item_repo->shouldReceive( 'create' )
            ->withArgs( fn( $data ) => $data['ordre'] === 8 )
            ->once()
            ->andReturn( 3 );
        $item = [ 'id' => 3, 'libelle' => 'Casse assiette', 'categorie' => 'CASSE', 'prix_unitaire' => 5.0, 'unite' => 'UNITE', 'actif' => true ];
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 3 )->andReturn( $item );

        $this->service->create( [ 'libelle' => 'Casse assiette', 'categorie' => 'CASSE', 'prix_unitaire' => 5.0 ] );
    }

    // ── update : validation partielle ────────────────────────────────────────────

    public function test_update_echoue_si_item_introuvable(): void {
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 999 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->update( 999, [ 'prix_unitaire' => 10.0 ] );
    }

    public function test_update_partiel_ne_valide_que_les_champs_fournis(): void {
        $item = [ 'id' => 1, 'libelle' => 'Test', 'categorie' => 'CASSE', 'prix_unitaire' => 5.0 ];
        $this->item_repo->shouldReceive( 'find_by_id' )->andReturn( $item );
        // Mise à jour prix uniquement, aucune exception attendue
        $this->item_repo->shouldReceive( 'update' )->once();

        $this->service->update( 1, [ 'prix_unitaire' => 12.0 ] );
    }

    // ── deactivate ────────────────────────────────────────────────────────────────

    public function test_deactivate_echoue_si_item_introuvable(): void {
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 1 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->deactivate( 1 );
    }

    public function test_deactivate_appelle_repo_deactivate(): void {
        $item = [ 'id' => 1, 'libelle' => 'Casse', 'actif' => true ];
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 1 )->andReturn( $item );
        $this->item_repo->shouldReceive( 'deactivate' )->with( 1 )->once();

        $this->service->deactivate( 1 );
    }

    // ── promouvoir ────────────────────────────────────────────────────────────────

    public function test_promouvoir_echoue_si_ligne_introuvable(): void {
        $this->ligne_repo->shouldReceive( 'find_by_id' )->with( 10 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->promouvoir( 10, [ 'categorie_item' => 'CASSE', 'unite' => 'UNITE' ] );
    }

    public function test_promouvoir_echoue_si_ligne_pas_libre(): void {
        $ligne = [ 'id' => 10, 'type_ligne' => 'SUPPLEMENT', 'libelle' => 'Casse', 'prix_unitaire' => 5.0 ];
        $this->ligne_repo->shouldReceive( 'find_by_id' )->with( 10 )->andReturn( $ligne );

        $this->expectException( InvalidInputException::class );
        $this->expectExceptionMessageMatches( '/LIBRE/' );
        $this->service->promouvoir( 10, [ 'categorie_item' => 'CASSE' ] );
    }

    public function test_promouvoir_cree_item_et_met_a_jour_ligne(): void {
        $ligne = [ 'id' => 10, 'type_ligne' => 'LIBRE', 'libelle' => 'Casse verre', 'prix_unitaire' => 3.0 ];
        $this->ligne_repo->shouldReceive( 'find_by_id' )->with( 10 )->andReturn( $ligne );
        $this->item_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['libelle'] === 'Verre cassé' && $d['categorie'] === 'CASSE' )
            ->andReturn( 5 );
        $this->ligne_repo->shouldReceive( 'promouvoir' )->with( 10, 5 )->once();
        $item_result = [ 'id' => 5, 'libelle' => 'Verre cassé', 'categorie' => 'CASSE', 'prix_unitaire' => 3.0 ];
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 5 )->andReturn( $item_result );

        $result = $this->service->promouvoir( 10, [
            'categorie_item' => 'CASSE',
            'unite'          => 'UNITE',
            'nom_catalogue'  => 'Verre cassé',
        ] );

        $this->assertSame( 5, $result['id'] );
    }

    public function test_promouvoir_utilise_libelle_ligne_si_nom_absent(): void {
        $ligne = [ 'id' => 10, 'type_ligne' => 'LIBRE', 'libelle' => 'Casse verre', 'prix_unitaire' => 3.0 ];
        $this->ligne_repo->shouldReceive( 'find_by_id' )->andReturn( $ligne );
        $this->item_repo->shouldReceive( 'create' )
            ->withArgs( fn( $d ) => $d['libelle'] === 'Casse verre' )
            ->andReturn( 6 );
        $this->ligne_repo->shouldReceive( 'promouvoir' )->andReturn( null );
        $this->item_repo->shouldReceive( 'find_by_id' )->with( 6 )->andReturn( [ 'id' => 6, 'libelle' => 'Casse verre' ] );

        $result = $this->service->promouvoir( 10, [ 'categorie_item' => 'CASSE' ] );
        $this->assertSame( 'Casse verre', $result['libelle'] );
    }
}
