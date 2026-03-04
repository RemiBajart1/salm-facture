package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import org.ucjgsalm.locagest.domain.Locataire;

@Singleton
public class LocataireRepository {

    private final DataSource ds;

    public LocataireRepository(DataSource ds) { this.ds = ds; }

    /**
     * Crée le locataire s'il n'existe pas encore (lookup par email),
     * sinon met à jour nom/téléphone/adresse.
     *
     * <p>Requiert la contrainte {@code UNIQUE(email)} posée par la migration Flyway V2.
     * Flyway garantit l'ordre V1 (création table) → V2 (ajout contrainte) au démarrage.
     */
    public Locataire upsertByEmail(String email, String nom,
                                   String telephone, String adresse) throws SQLException {
        String sql = """
            INSERT INTO locataire (id, nom, email, telephone, adresse)
            VALUES (gen_random_uuid(), ?, ?, ?, ?)
            ON CONFLICT (email) DO UPDATE
            SET nom       = EXCLUDED.nom,
                telephone = EXCLUDED.telephone,
                adresse   = COALESCE(EXCLUDED.adresse, locataire.adresse)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setString(1, nom);
            ps.setString(2, email);
            ps.setString(3, telephone);
            ps.setString(4, adresse);
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    public Optional<Locataire> findById(UUID id) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT * FROM locataire WHERE id = ?")) {
            ps.setObject(1, id);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    public List<Locataire> search(String query) throws SQLException {
        String sql = """
            SELECT * FROM locataire
            WHERE nom ILIKE ? OR email ILIKE ?
            ORDER BY nom LIMIT 20
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            String q = "%" + query + "%";
            ps.setString(1, q);
            ps.setString(2, q);
            var rs = ps.executeQuery();
            var list = new ArrayList<Locataire>();
            while (rs.next()) list.add(map(rs));
            return list;
        }
    }

    private Locataire map(ResultSet rs) throws SQLException {
        return new Locataire(
            rs.getObject("id", UUID.class),
            rs.getString("nom"),
            rs.getString("email"),
            rs.getString("telephone"),
            rs.getString("adresse"),
            rs.getObject("created_at", java.time.OffsetDateTime.class)
        );
    }
}
