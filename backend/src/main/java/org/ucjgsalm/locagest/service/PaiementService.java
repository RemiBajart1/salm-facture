package org.ucjgsalm.locagest.service;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;
import org.ucjgsalm.locagest.repository.*;

/**
 * Gestion des paiements : enregistrement chèque/virement, upload photo, marquage PAYEE.
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
public class PaiementService {

    private final DataSource        ds;
    private final FactureRepository factureRepo;
    private final S3Service         s3;

    /**
     * Enregistre un paiement chèque ou virement.
     * Si le montant total encaissé couvre intégralement la facture, la facture passe à PAYEE.
     *
     * @param sejourId         séjour concerné
     * @param mode             CHEQUE ou VIREMENT
     * @param montant          montant encaissé
     * @param dateEnc          date d'encaissement
     * @param numeroCheque     numéro du chèque (optionnel)
     * @param banqueEmettrice  banque émettrice (optionnel)
     * @param photoBytes       photo du chèque en bytes (optionnel)
     * @param photoContentType mime type de la photo
     * @param gardienId        sub Cognito du gardien
     */
    public Paiement enregistrer(UUID sejourId, ModePaiement mode, BigDecimal montant,
                                LocalDate dateEnc, String numeroCheque, String banqueEmettrice,
                                byte[] photoBytes, String photoContentType,
                                String gardienId) throws Exception {

        if (montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant doit être positif");
        }

        var facture = factureRepo.findBySejourId(sejourId)
            .orElseThrow(() -> new IllegalStateException(
                "Aucune facture émise pour le séjour " + sejourId + " — générer la facture d'abord"));

        if (facture.statut() == StatutFacture.PAYEE) {
            throw new IllegalStateException("La facture " + facture.numero() + " est déjà marquée payée");
        }

        var paiementId = UUID.randomUUID();
        String chequeS3Key = null;
        if (photoBytes != null && photoBytes.length > 0) {
            chequeS3Key = s3.uploadCheque(photoBytes, sejourId.toString(),
                                          paiementId.toString(), photoContentType);
            log.debug("Photo chèque uploadée : {}", chequeS3Key);
        }

        var paiement = insertPaiement(new Paiement(
            paiementId, sejourId, mode, montant, dateEnc,
            numeroCheque, banqueEmettrice, chequeS3Key, gardienId, null
        ));

        BigDecimal totalEncaisse = totalEncaisse(sejourId);
        if (totalEncaisse.compareTo(facture.montantTotal()) >= 0) {
            factureRepo.marquerPayee(facture.id());
            log.info("Facture {} marquée PAYEE (total encaissé={}€)", facture.numero(), totalEncaisse);
        }

        log.info("Paiement {} enregistré : {}€ {} pour séjour={}", paiementId, montant, mode, sejourId);
        return paiement;
    }

    /**
     * Retourne tous les paiements d'un séjour, triés par date d'enregistrement.
     *
     * @param sejourId identifiant du séjour
     */
    public List<Paiement> findBySejourId(UUID sejourId) throws Exception {
        String sql = "SELECT * FROM paiement WHERE sejour_id = ? ORDER BY created_at";
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sejourId);
            var rs   = ps.executeQuery();
            var list = new ArrayList<Paiement>();
            while (rs.next()) list.add(mapPaiement(rs));
            return list;
        }
    }

    private BigDecimal totalEncaisse(UUID sejourId) throws SQLException {
        String sql = "SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE sejour_id = ?";
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sejourId);
            var rs = ps.executeQuery();
            rs.next();
            return rs.getBigDecimal(1);
        }
    }

    private Paiement insertPaiement(Paiement p) throws SQLException {
        String sql = """
            INSERT INTO paiement
                (id, sejour_id, mode, montant, date_encaissement,
                 numero_cheque, banque_emettrice, cheque_s3_key, enregistre_par)
            VALUES (?, ?, ?::mode_paiement, ?, ?, ?, ?, ?, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, p.id());
            ps.setObject(2, p.sejourId());
            ps.setString(3, p.mode().name());
            ps.setBigDecimal(4, p.montant());
            ps.setObject(5, p.dateEncaissement());
            ps.setString(6, p.numeroCheque());
            ps.setString(7, p.banqueEmettrice());
            ps.setString(8, p.chequeS3Key());
            ps.setString(9, p.enregistrePar());
            var rs = ps.executeQuery();
            rs.next();
            return mapPaiement(rs);
        }
    }

    private Paiement mapPaiement(ResultSet rs) throws SQLException {
        return new Paiement(
            rs.getObject("id",        UUID.class),
            rs.getObject("sejour_id", UUID.class),
            ModePaiement.valueOf(rs.getString("mode")),
            rs.getBigDecimal("montant"),
            rs.getObject("date_encaissement", LocalDate.class),
            rs.getString("numero_cheque"),
            rs.getString("banque_emettrice"),
            rs.getString("cheque_s3_key"),
            rs.getString("enregistre_par"),
            rs.getObject("created_at", java.time.OffsetDateTime.class)
        );
    }
}
