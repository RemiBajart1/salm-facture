package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import org.ucjgsalm.locagest.domain.Facture;
import org.ucjgsalm.locagest.domain.Paiement;
import org.ucjgsalm.locagest.domain.enums.*;

@Singleton
public class FactureRepository {

    private final DataSource ds;

    public FactureRepository(DataSource ds) { this.ds = ds; }

    public Optional<Facture> findBySejourId(UUID sejourId) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT * FROM facture WHERE sejour_id = ?")) {
            ps.setObject(1, sejourId);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    public List<Facture> findByStatut(StatutFacture statut) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "SELECT * FROM facture WHERE statut = ?::statut_facture ORDER BY date_generation DESC")) {
            ps.setString(1, statut.name());
            return mapAll(ps.executeQuery());
        }
    }

    /**
     * Génère un numéro séquentiel atomique de la forme FAC-YYYY-NNN.
     * Utilise un upsert sur facture_sequence dans une transaction SERIALIZABLE
     * pour garantir l'unicité même sous concurrence.
     */
    public String nextNumero(int annee) throws SQLException {
        String sql = """
            INSERT INTO facture_sequence (annee, counter)
            VALUES (?, 1)
            ON CONFLICT (annee) DO UPDATE
            SET counter = facture_sequence.counter + 1
            RETURNING counter
            """;
        try (var conn = ds.getConnection()) {
            conn.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
            conn.setAutoCommit(false);
            try (var ps = conn.prepareStatement(sql)) {
                ps.setInt(1, annee);
                var rs = ps.executeQuery();
                rs.next();
                int counter = rs.getInt("counter");
                conn.commit();
                return String.format("FAC-%d-%03d", annee, counter);
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    public Facture insert(Facture f) throws SQLException {
        String sql = """
            INSERT INTO facture (
                id, sejour_id, numero, montant_hebergement, montant_energie,
                montant_taxe, montant_supplements, montant_total, statut
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::statut_facture)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1,  f.id());
            ps.setObject(2,  f.sejourId());
            ps.setString(3,  f.numero());
            ps.setBigDecimal(4,  f.montantHebergement());
            ps.setBigDecimal(5,  f.montantEnergie());
            ps.setBigDecimal(6,  f.montantTaxe());
            ps.setBigDecimal(7,  f.montantSupplements());
            ps.setBigDecimal(8,  f.montantTotal());
            ps.setString(9,  f.statut().name());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    public void updatePdfKey(UUID factureId, String s3Key) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "UPDATE facture SET pdf_s3_key = ?, statut = 'EMISE'::statut_facture WHERE id = ?")) {
            ps.setString(1, s3Key);
            ps.setObject(2, factureId);
            ps.executeUpdate();
        }
    }

    public void marquerEmailEnvoye(UUID factureId) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "UPDATE facture SET email_envoye = TRUE, email_envoye_at = now() WHERE id = ?")) {
            ps.setObject(1, factureId);
            ps.executeUpdate();
        }
    }

    public void marquerPayee(UUID factureId) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "UPDATE facture SET statut = 'PAYEE'::statut_facture WHERE id = ?")) {
            ps.setObject(1, factureId);
            ps.executeUpdate();
        }
    }

    private Facture map(ResultSet rs) throws SQLException {
        return new Facture(
            rs.getObject("id",        UUID.class),
            rs.getObject("sejour_id", UUID.class),
            rs.getString("numero"),
            rs.getObject("date_generation", java.time.OffsetDateTime.class),
            rs.getBigDecimal("montant_hebergement"),
            rs.getBigDecimal("montant_energie"),
            rs.getBigDecimal("montant_taxe"),
            rs.getBigDecimal("montant_supplements"),
            rs.getBigDecimal("montant_total"),
            StatutFacture.valueOf(rs.getString("statut")),
            rs.getString("pdf_s3_key"),
            rs.getBoolean("email_envoye"),
            rs.getObject("email_envoye_at", java.time.OffsetDateTime.class)
        );
    }

    private List<Facture> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<Facture>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}
