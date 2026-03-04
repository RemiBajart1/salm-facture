package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import org.ucjgsalm.locagest.domain.Sejour;
import org.ucjgsalm.locagest.domain.enums.*;

@Singleton
public class SejourRepository {

    private final DataSource ds;

    public SejourRepository(DataSource ds) { this.ds = ds; }

    // ── Lecture ────────────────────────────────────────────────────────────

    public Optional<Sejour> findById(UUID id) throws SQLException {
        String sql = """
            SELECT s.*, l.nom AS loc_nom
            FROM sejour s
            JOIN locataire l ON l.id = s.locataire_id
            WHERE s.id = ?
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, id);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    /** Séjour actif (EN_COURS ou dernier PLANIFIE) — page accueil gardien. */
    public Optional<Sejour> findCurrent() throws SQLException {
        String sql = """
            SELECT s.*
            FROM sejour s
            WHERE s.statut = 'EN_COURS'
            ORDER BY s.date_arrivee
            LIMIT 1
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    public List<Sejour> findByStatut(StatutSejour statut) throws SQLException {
        String sql = "SELECT * FROM sejour WHERE statut = ?::statut_sejour ORDER BY date_arrivee";
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setString(1, statut.name());
            var rs = ps.executeQuery();
            return mapAll(rs);
        }
    }

    // ── Écriture ───────────────────────────────────────────────────────────

    public Sejour insert(Sejour s) throws SQLException {
        String sql = """
            INSERT INTO sejour (
                id, locataire_id, statut, date_arrivee, date_depart,
                heure_arrivee_prevue, heure_depart_prevu,
                nb_adultes, min_personnes_total,
                mode_paiement, date_limite_paiement,
                options_presaisies, notes_internes,
                created_by
            ) VALUES (?, ?, ?::statut_sejour, ?, ?, ?, ?, ?, ?, ?::mode_paiement, ?, ?, ?, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1,  s.id());
            ps.setObject(2,  s.locataireId());
            ps.setString(3,  s.statut().name());
            ps.setObject(4,  s.dateArrivee());
            ps.setObject(5,  s.dateDepart());
            ps.setObject(6,  s.heureArriveePrevue());
            ps.setObject(7,  s.heureDepartPrevu());
            ps.setObject(8,  s.nbAdultes());
            ps.setInt(9,     s.minPersonnesTotal());
            ps.setString(10, s.modePaiement() != null ? s.modePaiement().name() : null);
            ps.setObject(11, s.dateLimitePaiement());
            ps.setString(12, s.optionsPresaisies());
            ps.setString(13, s.notesInternes());
            ps.setString(14, s.createdBy());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    /** Mise à jour horaires réels par le gardien. */
    public void updateHorairesReels(UUID sejourId,
                                    LocalTime arrivee,
                                    LocalTime depart,
                                    String updatedBy) throws SQLException {
        String sql = """
            UPDATE sejour
            SET heure_arrivee_reelle = ?,
                heure_depart_reel    = ?,
                statut               = CASE WHEN statut = 'PLANIFIE' THEN 'EN_COURS'::statut_sejour ELSE statut END,
                updated_by           = ?,
                updated_at           = now()
            WHERE id = ?
            """;
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, arrivee);
            ps.setObject(2, depart);
            ps.setString(3, updatedBy);
            ps.setObject(4, sejourId);
            ps.executeUpdate();
        }
    }

    /** Mise à jour nb_adultes (pour taxe de séjour) par le gardien. */
    public void updateNbAdultes(UUID sejourId, int nbAdultes, String updatedBy) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "UPDATE sejour SET nb_adultes = ?, updated_by = ?, updated_at = now() WHERE id = ?")) {
            ps.setInt(1, nbAdultes);
            ps.setString(2, updatedBy);
            ps.setObject(3, sejourId);
            ps.executeUpdate();
        }
    }

    public void updateStatut(UUID sejourId, StatutSejour statut, String updatedBy) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "UPDATE sejour SET statut = ?::statut_sejour, updated_by = ?, updated_at = now() WHERE id = ?")) {
            ps.setString(1, statut.name());
            ps.setString(2, updatedBy);
            ps.setObject(3, sejourId);
            ps.executeUpdate();
        }
    }

    // ── Mapping ────────────────────────────────────────────────────────────

    private Sejour map(ResultSet rs) throws SQLException {
        return new Sejour(
            rs.getObject("id",           UUID.class),
            rs.getObject("locataire_id", UUID.class),
            StatutSejour.valueOf(rs.getString("statut")),
            rs.getObject("date_arrivee", LocalDate.class),
            rs.getObject("date_depart",  LocalDate.class),
            rs.getInt("nb_nuits"),
            rs.getObject("heure_arrivee_prevue", LocalTime.class),
            rs.getObject("heure_depart_prevu",   LocalTime.class),
            rs.getObject("heure_arrivee_reelle", LocalTime.class),
            rs.getObject("heure_depart_reel",    LocalTime.class),
            rs.getObject("nb_adultes",   Integer.class),
            rs.getInt("min_personnes_total"),
            rs.getString("mode_paiement") != null ? ModePaiement.valueOf(rs.getString("mode_paiement")) : null,
            rs.getObject("date_limite_paiement", LocalDate.class),
            rs.getString("options_presaisies"),
            rs.getString("notes_internes"),
            rs.getString("created_by"),
            rs.getString("updated_by"),
            rs.getObject("created_at", java.time.OffsetDateTime.class),
            rs.getObject("updated_at", java.time.OffsetDateTime.class)
        );
    }

    private List<Sejour> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<Sejour>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}
