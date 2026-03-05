package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import org.ucjgsalm.locagest.domain.*;

@Singleton
public class TarifPersonneRepository {

    private final DataSource ds;
    TarifPersonneRepository(DataSource ds) { this.ds = ds; }

    public List<TarifPersonne> findActifs() throws SQLException {
        return findAll("WHERE actif = TRUE");
    }

    public List<TarifPersonne> findAll() throws SQLException {
        return findAll("");
    }

    private List<TarifPersonne> findAll(String where) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "SELECT * FROM tarif_personne " + where + " ORDER BY ordre, nom")) {
            return mapAll(ps.executeQuery());
        }
    }

    public Optional<TarifPersonne> findById(UUID id) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT * FROM tarif_personne WHERE id = ?")) {
            ps.setObject(1, id);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    public TarifPersonne insert(TarifPersonne t) throws SQLException {
        String sql = """
            INSERT INTO tarif_personne (id, nom, prix_nuit, description, actif, ordre, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, t.id());
            ps.setString(2, t.nom());
            ps.setBigDecimal(3, t.prixNuit());
            ps.setString(4, t.description());
            ps.setBoolean(5, t.actif());
            ps.setInt(6, t.ordre());
            ps.setString(7, t.updatedBy());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    public TarifPersonne update(TarifPersonne t) throws SQLException {
        String sql = """
            UPDATE tarif_personne
            SET nom = ?, prix_nuit = ?, description = ?, actif = ?, ordre = ?, updated_by = ?, updated_at = now()
            WHERE id = ?
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setString(1, t.nom());
            ps.setBigDecimal(2, t.prixNuit());
            ps.setString(3, t.description());
            ps.setBoolean(4, t.actif());
            ps.setInt(5, t.ordre());
            ps.setString(6, t.updatedBy());
            ps.setObject(7, t.id());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    private TarifPersonne map(ResultSet rs) throws SQLException {
        return new TarifPersonne(
            rs.getObject("id",  UUID.class),
            rs.getString("nom"),
            rs.getBigDecimal("prix_nuit"),
            rs.getString("description"),
            rs.getBoolean("actif"),
            rs.getInt("ordre"),
            rs.getObject("created_at", java.time.OffsetDateTime.class),
            rs.getObject("updated_at", java.time.OffsetDateTime.class),
            rs.getString("updated_by")
        );
    }

    private List<TarifPersonne> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<TarifPersonne>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}
