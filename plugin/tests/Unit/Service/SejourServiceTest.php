<?php

declare(strict_types=1);

namespace Locagest\Tests\Unit\Service;

use Locagest\Repository\ConfigSiteRepository;
use Locagest\Repository\LocataireRepository;
use Locagest\Repository\SejourCategorieRepository;
use Locagest\Repository\SejourRepository;
use Locagest\Repository\TarifPersonneRepository;
use Locagest\Service\SejourService;
use Locagest\Tests\Unit\LocagestUnitTestCase;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;
use Mockery;

class SejourServiceTest extends LocagestUnitTestCase {

    private SejourService $service;
    private SejourRepository $sejour_repo;
    private SejourCategorieRepository $categorie_repo;
    private TarifPersonneRepository $tarif_repo;
    private LocataireRepository $locataire_repo;
    private ConfigSiteRepository $config_repo;

    protected function setUp(): void {
        parent::setUp();
        $this->sejour_repo    = Mockery::mock( SejourRepository::class );
        $this->categorie_repo = Mockery::mock( SejourCategorieRepository::class );
        $this->tarif_repo     = Mockery::mock( TarifPersonneRepository::class );
        $this->locataire_repo = Mockery::mock( LocataireRepository::class );
        $this->config_repo    = Mockery::mock( ConfigSiteRepository::class );

        $this->service = new SejourService(
            $this->sejour_repo,
            $this->categorie_repo,
            $this->tarif_repo,
            $this->locataire_repo,
            $this->config_repo,
        );
    }

    // ── validate_dates ────────────────────────────────────────────────────────────

    public function test_creer_echoue_si_date_debut_manquante(): void {
        $this->expectException( InvalidInputException::class );
        $this->service->creer( [ 'date_debut' => '', 'date_fin' => '2025-07-15', 'categories' => [] ] );
    }

    public function test_creer_echoue_si_date_fin_avant_debut(): void {
        $this->expectException( InvalidInputException::class );
        $this->service->creer( [
            'date_debut'                 => '2025-07-15',
            'date_fin'                   => '2025-07-14',
            'categories'                 => [],
            'tarif_forfait_categorie_id' => 1,
        ] );
    }

    public function test_creer_echoue_si_aucune_categorie(): void {
        $this->config_repo->shouldReceive( 'get' )->andReturn( 40 );

        $this->expectException( InvalidInputException::class );
        $this->service->creer( [
            'date_debut'                 => '2025-07-11',
            'date_fin'                   => '2025-07-13',
            'categories'                 => [],
            'tarif_forfait_categorie_id' => 1,
        ] );
    }

    // ── creer ─────────────────────────────────────────────────────────────────────

    public function test_creer_sejour_sans_locataire(): void {
        $this->config_repo->shouldReceive( 'get' )->with( 'min_personnes_defaut' )->andReturn( '40' );
        $this->sejour_repo->shouldReceive( 'create' )->once()->andReturn( 99 );
        $this->tarif_repo->shouldReceive( 'find_by_id' )->with( 1 )->andReturn( [
            'id' => 1, 'nom' => 'Extérieur', 'prix_nuit' => 18.0,
        ] );
        $this->categorie_repo->shouldReceive( 'create' )->once()->andReturn( 1 );

        $sejour_row = [ 'id' => 99, 'nb_nuits' => 2, 'statut' => 'PLANIFIE' ];
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 99 )->andReturn( $sejour_row );
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->with( 99 )->andReturn( [] );

        $result = $this->service->creer( [
            'date_debut'                 => '2025-07-11',
            'date_fin'                   => '2025-07-13',
            'categories'                 => [ [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 30 ] ],
            'tarif_forfait_categorie_id' => 1,
        ] );

        $this->assertSame( 99, $result['id'] );
        $this->assertArrayHasKey( 'categories', $result );
    }

    public function test_creer_sejour_upsert_locataire_si_email(): void {
        $this->config_repo->shouldReceive( 'get' )->andReturn( '40' );
        $this->locataire_repo->shouldReceive( 'upsert_by_email' )
            ->once()
            ->with( 'Dupont', 'dupont@test.fr', '', '' )
            ->andReturn( 5 );
        $this->sejour_repo->shouldReceive( 'create' )->once()->andReturn( 1 );
        $this->tarif_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 1, 'nom' => 'Ext', 'prix_nuit' => 18.0 ] );
        $this->categorie_repo->shouldReceive( 'create' )->andReturn( 1 );
        $this->sejour_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 1, 'nb_nuits' => 1 ] );
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->creer( [
            'date_debut'                 => '2025-07-11',
            'date_fin'                   => '2025-07-12',
            'locataire'                  => [ 'nom' => 'Dupont', 'email' => 'dupont@test.fr' ],
            'categories'                 => [ [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 20 ] ],
            'tarif_forfait_categorie_id' => 1,
        ] );
    }

    public function test_creer_echoue_si_tarif_introuvable(): void {
        $this->config_repo->shouldReceive( 'get' )->andReturn( '40' );
        $this->sejour_repo->shouldReceive( 'create' )->andReturn( 1 );
        $this->tarif_repo->shouldReceive( 'find_by_id' )->with( 999 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->creer( [
            'date_debut'                 => '2025-07-11',
            'date_fin'                   => '2025-07-13',
            'categories'                 => [ [ 'tarif_personne_id' => 999, 'nb_previsionnel' => 10 ] ],
            'tarif_forfait_categorie_id' => 999,
        ] );
    }

    // ── calc_nb_nuits ─────────────────────────────────────────────────────────────

    public function test_creer_calcule_nb_nuits_correctement(): void {
        $this->config_repo->shouldReceive( 'get' )->andReturn( '40' );
        $this->sejour_repo->shouldReceive( 'create' )
            ->once()
            ->withArgs( fn( $data ) => $data['nb_nuits'] === 3 )
            ->andReturn( 1 );
        $this->tarif_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 1, 'nom' => 'Ext', 'prix_nuit' => 18.0 ] );
        $this->categorie_repo->shouldReceive( 'create' )->andReturn( 1 );
        $this->sejour_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 1 ] );
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->creer( [
            'date_debut'                 => '2025-07-11',
            'date_fin'                   => '2025-07-14',  // 3 nuits
            'categories'                 => [ [ 'tarif_personne_id' => 1, 'nb_previsionnel' => 20 ] ],
            'tarif_forfait_categorie_id' => 1,
        ] );
    }

    // ── find_or_fail ──────────────────────────────────────────────────────────────

    public function test_find_or_fail_leve_not_found(): void {
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 42 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->expectExceptionMessageMatches( '/42/' );
        $this->service->find_or_fail( 42 );
    }

    public function test_find_or_fail_retourne_sejour(): void {
        $sejour = [ 'id' => 7, 'statut' => 'PLANIFIE' ];
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 7 )->andReturn( $sejour );

        $result = $this->service->find_or_fail( 7 );
        $this->assertSame( 7, $result['id'] );
    }

    // ── update_personnes ─────────────────────────────────────────────────────────

    public function test_update_personnes_met_a_jour_nb_adultes(): void {
        $sejour = [ 'id' => 1, 'statut' => 'EN_COURS' ];
        $this->sejour_repo->shouldReceive( 'find_by_id' )->andReturn( $sejour );
        $this->sejour_repo->shouldReceive( 'update' )->with( 1, [ 'nb_adultes' => 22 ] )->once();
        $this->categorie_repo->shouldReceive( 'update_nb_reelles' )->with( 10, 25 )->once();
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->update_personnes( 1, [
            'nb_adultes' => 22,
            'categories' => [ [ 'id' => 10, 'nb_reelles' => 25 ] ],
        ] );
    }

    public function test_update_personnes_met_a_jour_nb_adultes_et_nb_enfants(): void {
        $sejour = [ 'id' => 1, 'statut' => 'EN_COURS' ];
        $this->sejour_repo->shouldReceive( 'find_by_id' )->andReturn( $sejour );
        $this->sejour_repo->shouldReceive( 'update' )
            ->withArgs( fn( $id, $d ) => $d['nb_adultes'] === 20 && $d['nb_enfants'] === 5 )
            ->once();
        $this->categorie_repo->shouldNotReceive( 'update_nb_reelles' );
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->update_personnes( 1, [ 'nb_adultes' => 20, 'nb_enfants' => 5 ] );
    }

    public function test_update_personnes_leve_not_found_si_sejour_absent(): void {
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 99 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->update_personnes( 99, [ 'nb_adultes' => 10 ] );
    }

    // ── update_horaires ───────────────────────────────────────────────────────────

    public function test_update_horaires_met_a_jour_les_champs_fournis(): void {
        $this->sejour_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 1, 'statut' => 'EN_COURS' ] );
        $this->sejour_repo->shouldReceive( 'update' )
            ->withArgs( fn( $id, $d ) => $id === 1 && $d === [ 'heure_arrivee_reelle' => '16:00', 'statut' => 'EN_COURS' ] )
            ->once();
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->update_horaires( 1, [ 'heure_arrivee_reelle' => '16:00', 'statut' => 'EN_COURS' ] );
    }

    public function test_update_horaires_ne_modifie_rien_si_aucun_champ(): void {
        $this->sejour_repo->shouldReceive( 'find_by_id' )->andReturn( [ 'id' => 1 ] );
        $this->sejour_repo->shouldNotReceive( 'update' );
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->andReturn( [] );

        $this->service->update_horaires( 1, [] );
    }

    public function test_update_horaires_leve_not_found_si_sejour_absent(): void {
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 99 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->update_horaires( 99, [ 'heure_arrivee_reelle' => '16:00' ] );
    }

    // ── get_detail ────────────────────────────────────────────────────────────────

    public function test_get_detail_inclut_les_categories(): void {
        $categories = [ [ 'id' => 1, 'nom_snapshot' => 'Extérieur', 'nb_reelles' => 25 ] ];
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 1 )->andReturn( [ 'id' => 1, 'statut' => 'PLANIFIE' ] );
        $this->categorie_repo->shouldReceive( 'find_by_sejour' )->with( 1 )->andReturn( $categories );

        $result = $this->service->get_detail( 1 );

        $this->assertArrayHasKey( 'categories', $result );
        $this->assertCount( 1, $result['categories'] );
        $this->assertSame( 'Extérieur', $result['categories'][0]['nom_snapshot'] );
    }

    public function test_get_detail_leve_not_found_si_sejour_absent(): void {
        $this->sejour_repo->shouldReceive( 'find_by_id' )->with( 42 )->andReturn( null );

        $this->expectException( NotFoundException::class );
        $this->service->get_detail( 42 );
    }

    // ── enrich_list_with_categories ───────────────────────────────────────────────

    public function test_enrich_list_retourne_liste_vide_inchangee(): void {
        $paginated = [ 'items' => [], 'total' => 0, 'page' => 0, 'size' => 20 ];

        $result = $this->service->enrich_list_with_categories( $paginated );

        $this->assertSame( [], $result['items'] );
        $this->assertSame( 0, $result['total'] );
    }

    public function test_enrich_list_attache_les_categories_par_sejour(): void {
        $items = [
            [ 'id' => 1, 'statut' => 'PLANIFIE' ],
            [ 'id' => 2, 'statut' => 'EN_COURS' ],
        ];
        $cats_by_sejour = [
            1 => [ [ 'id' => 10, 'nom_snapshot' => 'Extérieur' ] ],
            2 => [ [ 'id' => 20, 'nom_snapshot' => 'Membres' ], [ 'id' => 21, 'nom_snapshot' => 'Jeunes' ] ],
        ];
        $this->categorie_repo->shouldReceive( 'find_by_sejour_ids' )->with( [ 1, 2 ] )->andReturn( $cats_by_sejour );

        $result = $this->service->enrich_list_with_categories( [ 'items' => $items, 'total' => 2, 'page' => 0, 'size' => 20 ] );

        $this->assertCount( 1, $result['items'][0]['categories'] );
        $this->assertCount( 2, $result['items'][1]['categories'] );
    }

    public function test_enrich_list_attache_tableau_vide_si_sejour_sans_categorie(): void {
        $items = [ [ 'id' => 5, 'statut' => 'PLANIFIE' ] ];
        $this->categorie_repo->shouldReceive( 'find_by_sejour_ids' )->with( [ 5 ] )->andReturn( [] );

        $result = $this->service->enrich_list_with_categories( [ 'items' => $items, 'total' => 1, 'page' => 0, 'size' => 20 ] );

        $this->assertSame( [], $result['items'][0]['categories'] );
    }
}
