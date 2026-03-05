package org.ucjgsalm.locagest.repository;

import jakarta.inject.Singleton;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import org.ucjgsalm.locagest.domain.*;
import org.ucjgsalm.locagest.domain.enums.*;

@Singleton
public class ConfigItemRepository {

    private final DataSource ds;
    public ConfigItemRepository(DataSource ds) { this.ds = ds; }

    public Optional<ConfigItem> findById(UUID id) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement("SELECT * FROM config_item WHERE id = ?")) {
            ps.setObject(1, id);
            var rs = ps.executeQuery();
            if (rs.next()) return Optional.of(map(rs));
            return Optional.empty();
        }
    }

    public List<ConfigItem> findActifs() throws SQLException {
        return findAll("WHERE actif = TRUE");
    }

    public List<ConfigItem> findAll() throws SQLException {
        return findAll("");
    }

    private List<ConfigItem> findAll(String where) throws SQLException {
        try (var conn = ds.getConnection();
             var ps = conn.prepareStatement(
                 "SELECT * FROM config_item " + where + " ORDER BY categorie, designation")) {
            return mapAll(ps.executeQuery());
        }
    }

    public ConfigItem insert(ConfigItem item) throws SQLException {
        String sql = """
            INSERT INTO config_item (id, designation, categorie, prix_unitaire, unite, actif)
            VALUES (?, ?, ?::categorie_item, ?, ?::unite_item, ?)
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setObject(1, item.id());
            ps.setString(2, item.designation());
            ps.setString(3, item.categorie().name());
            ps.setBigDecimal(4, item.prixUnitaire());
            ps.setString(5, item.unite().name());
            ps.setBoolean(6, item.actif());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    public ConfigItem update(ConfigItem item) throws SQLException {
        String sql = """
            UPDATE config_item
            SET designation = ?, categorie = ?::categorie_item, prix_unitaire = ?, unite = ?::unite_item, actif = ?, updated_at = now()
            WHERE id = ?
            RETURNING *
            """;
        try (var conn = ds.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setString(1, item.designation());
            ps.setString(2, item.categorie().name());
            ps.setBigDecimal(3, item.prixUnitaire());
            ps.setString(4, item.unite().name());
            ps.setBoolean(5, item.actif());
            ps.setObject(6, item.id());
            var rs = ps.executeQuery();
            rs.next();
            return map(rs);
        }
    }

    private ConfigItem map(ResultSet rs) throws SQLException {
        return new ConfigItem(
            rs.getObject("id", UUID.class),
            rs.getString("designation"),
            CategorieItem.valueOf(rs.getString("categorie")),
            rs.getBigDecimal("prix_unitaire"),
            UniteItem.valueOf(rs.getString("unite")),
            rs.getBoolean("actif"),
            rs.getObject("created_at", java.time.OffsetDateTime.class),
            rs.getObject("updated_at", java.time.OffsetDateTime.class)
        );
    }

    private List<ConfigItem> mapAll(ResultSet rs) throws SQLException {
        var list = new ArrayList<ConfigItem>();
        while (rs.next()) list.add(map(rs));
        return list;
    }
}
