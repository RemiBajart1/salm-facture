<?php

declare(strict_types=1);

namespace Locagest\Service;

use Locagest\Repository\PaiementRepository;
use Locagest\Repository\FactureRepository;
use Locagest\Utils\Exceptions\InvalidInputException;
use Locagest\Utils\Exceptions\NotFoundException;

class PaiementService {

    public function __construct(
        private readonly PaiementRepository $paiement_repo,
        private readonly FactureRepository  $facture_repo,
        private readonly SejourService      $sejour_service,
        private readonly FileService        $file_service,
    ) {}

    public function list_by_sejour( int $sejour_id ): array {
        $this->sejour_service->find_or_fail( $sejour_id );
        return $this->paiement_repo->find_by_sejour( $sejour_id );
    }

    /**
     * Enregistre un paiement pour un séjour.
     * @param array $data { montant, mode, reference?, date_paiement, notes? }
     */
    public function enregistrer( int $sejour_id, array $data ): array {
        $this->sejour_service->find_or_fail( $sejour_id );
        $this->validate( $data );

        $id = $this->paiement_repo->create( [
            'sejour_id'     => $sejour_id,
            'montant'       => (float) $data['montant'],
            'mode'          => $data['mode'],
            'reference'     => $data['reference'] ?? '',
            'date_paiement' => $data['date_paiement'],
            'notes'         => $data['notes'] ?? '',
        ] );

        $paiement = [ 'id' => $id ] + $data + [ 'sejour_id' => $sejour_id ];

        // Marquer la facture PAYEE si le total encaissé couvre le total facturé
        $facture = $this->facture_repo->find_by_sejour( $sejour_id );
        if ( $facture ) {
            $total_encaisse = $this->paiement_repo->total_encaisse( $sejour_id );
            if ( $total_encaisse >= (float) $facture['montant_total'] ) {
                $this->facture_repo->update( (int) $facture['id'], [ 'statut' => 'PAYEE' ] );
            }
        }

        return $this->paiement_repo->find_by_sejour( $sejour_id );
    }

    /**
     * Attache une ou plusieurs photos à un paiement.
     * @param array $files Tableau de ['content' => string, 'mime' => string]
     */
    public function attacher_photos( int $paiement_id, array $files ): void {
        $paths = [];
        foreach ( $files as $i => $file ) {
            $paths[] = $this->file_service->save_cheque( $paiement_id, $file['content'], $file['mime'], $i );
        }
        $this->paiement_repo->update( $paiement_id, [ 'photo_cheque_path' => json_encode( $paths ) ] );
    }

    private function validate( array $data ): void {
        $modes_valides = [ 'CHEQUE', 'VIREMENT', 'ESPECES' ];
        if ( empty( $data['montant'] ) || (float) $data['montant'] <= 0 ) {
            throw new InvalidInputException( 'Le montant doit être supérieur à 0.' );
        }
        if ( ! in_array( $data['mode'] ?? '', $modes_valides, true ) ) {
            throw new InvalidInputException( 'Mode de paiement invalide. Valeurs : ' . implode( ', ', $modes_valides ) );
        }
        if ( empty( $data['date_paiement'] ) ) {
            throw new InvalidInputException( 'La date de paiement est obligatoire.' );
        }
    }
}
