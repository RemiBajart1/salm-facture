package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.ucjgsalm.locagest.domain.LigneSejour;
import org.ucjgsalm.locagest.domain.enums.*;

@Singleton
public class LigneSejourRepository {

    private final DataSource ds;

    public LigneSejourRepository(DataSource ds) { this.ds = ds; }

    public List<LigneSejour> findBySejourId(UUID sejourId) throws SQLException {
        String sql = """
            SELECT * FROM ligne_sejour
            WHERE sejour_id = ?
            ORDER BY type_ligne, created_at
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sejourId);
            return mapAll(ps.executeQuery());
        }
    }

    /** Toutes les lignes LIBRE de tous les séjours — onglet "À promouvoir" du trésorier/resp. */
    public List<LigneSejour> findAllLibre() throws SQLException {
        String sql = """
            SELECT ls.*, s.date_arrivee, l.nom AS loc_nom
            FROM ligne_sejour ls
            JOIN sejour s ON s.id = ls.sejour_id
            JOIN locataire l ON l.id = s.locataire_id
            WHERE ls.statut = 'LIBRE'
            ORDER BY ls.created_at DESC
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            return mapAll(ps.executeQuery());
        }
    }

    public Optional<LigneSejour> findById(UUID id) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT * FROM ligne_sejour WHERE id = ?")) {
            ps.setObject(1, id);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    /** Insère une ligne. Ne pas passer montant (GENERATED). */
    public LigneSejour insert(LigneSejour l) throws SQLException {
        String sql = """
            INSERT INTO ligne_sejour
                (id, sejour_id, config_item_id, type_ligne, designation,
                 quantite, prix_unitaire, statut, saisi_par)
            VALUES (?, ?, ?, ?::type_ligne, ?, ?, ?, ?::statut_ligne, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, l.id());
            ps.setObject(2, l.sejourId());
            ps.setObject(3, l.configItemId());
            ps.setString(4, l.typeLigne().name());
            ps.setString(5, l.designation());
            ps.setBigDecimal(6, l.quantite());
            ps.setBigDecimal(7, l.prixUnitaire());
            ps.setString(8, l.statut().name());
            ps.setString(9, l.saisiPar());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    /**
     * Supprime toutes les lignes d'un type donné pour un séjour.
     * Doit être appelée dans un contexte {@code @Transactional}.
     */
    public void deleteBySejourIdAndType(UUID sejourId, TypeLigne type) throws SQLException {
        String sql = "DELETE FROM ligne_sejour WHERE sejour_id = ? AND type_ligne = ?::type_ligne";
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sejourId);
            ps.setString(2, type.name());
            ps.executeUpdate();
        }
    }

    /**
     * Promotion LIBRE → SUPPLEMENT :
     * met à jour type_ligne, statut et config_item_id de la ligne existante.
     */
    public void promouvoir(UUID ligneId, UUID configItemId) throws SQLException {
        String sql = """
            UPDATE ligne_sejour
            SET type_ligne     = 'SUPPLEMENT'::type_ligne,
                statut         = 'CONFIRME'::statut_ligne,
                config_item_id = ?
            WHERE id = ? AND statut = 'LIBRE'
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, configItemId);
            ps.setObject(2, ligneId);
            int updated = ps.executeUpdate();
            if (updated == 0) throw new IllegalStateException(
                "Ligne " + ligneId + " introuvable ou déjà promue");
        }
    }

    // ── Mapping ────────────────────────────────────────────────────────────

    private LigneSejour map(ResultSet rs) throws SQLException {
        return new LigneSejour(
            rs.getObject("id",             UUID.class),
            rs.getObject("sejour_id",      UUID.class),
            rs.getObject("config_item_id", UUID.class),
            TypeLigne.valueOf(rs.getString("type_ligne")),
            rs.getString("designation"),
            rs.getBigDecimal("quantite"),
            rs.getBigDecimal("prix_unitaire"),
            rs.getBigDecimal("montant"),
            StatutLigne.valueOf(rs.getString("statut")),
            rs.getString("saisi_par"),
            rs.getObject("created_at", java.time.OffsetDateTime.class)
        );
    }

    private List<LigneSejour> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<LigneSejour>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}
